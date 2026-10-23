const XML_NS = "http://www.w3.org/XML/1998/namespace";

export type XmlAttribute = {
  name: string;
  prefix: string;
  localName: string;
  value: string;
};

export type NsDecl = {
  prefix: string;
  uri: string;
};

export type XmlElement = {
  name: string;
  prefix: string;
  localName: string;
  attrs: XmlAttribute[];
  nsDecls: NsDecl[];
  children: XmlChild[];
  parent: XmlElement | null;
};

export type XmlChild = XmlElement | string;

const MAX_DEPTH = 30;
const MAX_NODES = 2000;

export function xmlAttr(name: string, value: string): XmlAttribute {
  const colon = name.indexOf(":");
  return {
    name,
    prefix: colon === -1 ? "" : name.slice(0, colon),
    localName: colon === -1 ? name : name.slice(colon + 1),
    value,
  };
}

export function xmlNs(prefix: string, uri: string): NsDecl {
  return { prefix, uri };
}

export function xmlElement(
  qualifiedName: string,
  options?: {
    attrs?: XmlAttribute[];
    ns?: NsDecl[];
    children?: XmlChild[];
  },
): XmlElement {
  const colon = qualifiedName.indexOf(":");
  const element: XmlElement = {
    name: qualifiedName,
    prefix: colon === -1 ? "" : qualifiedName.slice(0, colon),
    localName: colon === -1 ? qualifiedName : qualifiedName.slice(colon + 1),
    attrs: options?.attrs ?? [],
    nsDecls: options?.ns ?? [],
    children: [],
    parent: null,
  };
  for (const child of options?.children ?? []) {
    if (typeof child !== "string") child.parent = element;
    element.children.push(child);
  }
  return element;
}

export function parseXml(input: string): XmlElement {
  if (input.includes("\0")) throw new Error("invalid xml");
  if (/<!(\s*)(DOCTYPE|ENTITY|ELEMENT|ATTLIST|NOTATION)/i.test(input)) {
    throw new Error("dtd forbidden");
  }
  const parser = new XmlParser(input);
  return parser.parse();
}

export function lookupNamespace(element: XmlElement | null, prefix: string): string | null {
  let current = element;
  while (current) {
    const decl = current.nsDecls.find((item) => item.prefix === prefix);
    if (decl) return decl.uri;
    current = current.parent;
  }
  if (prefix === "xml") return XML_NS;
  return null;
}

export function elementNamespace(element: XmlElement): string | null {
  if (element.prefix) return lookupNamespace(element, element.prefix);
  return lookupNamespace(element, "");
}

export function exclusiveCanonicalize(root: XmlElement, inclusivePrefixes: string[] = []): string {
  const rendered = new Map<string, string>([["xml", XML_NS]]);
  return renderElement(root, rendered, new Set(inclusivePrefixes), true);
}

function renderElement(
  element: XmlElement,
  rendered: Map<string, string>,
  inclusive: Set<string>,
  isApex: boolean,
): string {
  const utilized = new Set<string>();
  if (element.prefix) utilized.add(element.prefix);
  const ownNamespace = element.prefix ? lookupNamespace(element, element.prefix) : lookupNamespace(element, "");
  if (!element.prefix && ownNamespace) utilized.add("");
  if (isApex) {
    for (const prefix of inclusive) utilized.add(prefix);
  }
  for (const attr of element.attrs) {
    if (attr.prefix) utilized.add(attr.prefix);
  }

  const nextRendered = new Map(rendered);
  const nsAttrs: { name: string; value: string; sortKey: string }[] = [];

  if (!element.prefix && !ownNamespace && rendered.has("") && rendered.get("") !== "") {
    nsAttrs.push({ name: "xmlns", value: "", sortKey: "" });
    nextRendered.set("", "");
  }

  for (const prefix of utilized) {
    if (prefix === "xml") continue;
    const uri = prefix === "" ? ownNamespace : lookupNamespace(element, prefix);
    if (uri == null) throw new Error("unbound prefix");
    if (rendered.get(prefix) === uri) continue;
    nsAttrs.push({
      name: prefix === "" ? "xmlns" : `xmlns:${prefix}`,
      value: uri,
      sortKey: prefix,
    });
    nextRendered.set(prefix, uri);
  }

  nsAttrs.sort((left, right) => {
    if (left.sortKey === "") return -1;
    if (right.sortKey === "") return 1;
    if (left.sortKey < right.sortKey) return -1;
    if (left.sortKey > right.sortKey) return 1;
    return 0;
  });

  const regular = element.attrs.map((attr) => {
    const uri = attr.prefix ? lookupNamespace(element, attr.prefix) : "";
    if (attr.prefix && !uri) throw new Error("unbound attribute prefix");
    return { attr, uri: uri ?? "" };
  });
  regular.sort((left, right) => {
    if (left.uri !== right.uri) return left.uri < right.uri ? -1 : 1;
    if (left.attr.localName !== right.attr.localName) {
      return left.attr.localName < right.attr.localName ? -1 : 1;
    }
    return 0;
  });

  let output = `<${element.name}`;
  for (const ns of nsAttrs) output += ` ${ns.name}="${escapeAttr(ns.value)}"`;
  for (const item of regular) output += ` ${item.attr.name}="${escapeAttr(item.attr.value)}"`;
  output += ">";
  for (const child of element.children) {
    output += typeof child === "string" ? escapeText(child) : renderElement(child, nextRendered, inclusive, false);
  }
  output += `</${element.name}>`;
  return output;
}

function escapeText(value: string): string {
  return value.replace(/[&<>\r]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&#xD;";
  });
}

function escapeAttr(value: string): string {
  return value.replace(/[&<"\t\n\r]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === '"') return "&quot;";
    if (char === "\t") return "&#x9;";
    if (char === "\n") return "&#xA;";
    return "&#xD;";
  });
}

class XmlParser {
  private index = 0;
  private nodes = 0;

  constructor(private readonly input: string) {}

  parse(): XmlElement {
    this.skipProlog();
    const root = this.parseElement(null, 0);
    this.skipMisc();
    if (this.index !== this.input.length) throw new Error("trailing content");
    return root;
  }

  private parseElement(parent: XmlElement | null, depth: number): XmlElement {
    if (depth > MAX_DEPTH) throw new Error("xml too deep");
    this.nodes += 1;
    if (this.nodes > MAX_NODES) throw new Error("xml too large");
    this.expect("<");
    if (this.peek() === "/") throw new Error("invalid xml");
    const name = this.readName();
    const colon = name.indexOf(":");
    const element: XmlElement = {
      name,
      prefix: colon === -1 ? "" : name.slice(0, colon),
      localName: colon === -1 ? name : name.slice(colon + 1),
      attrs: [],
      nsDecls: [],
      children: [],
      parent,
    };

    while (true) {
      this.skipSpaces();
      if (this.startsWith("/>")) {
        this.index += 2;
        return element;
      }
      if (this.peek() === ">") {
        this.index += 1;
        break;
      }
      this.readAttribute(element);
    }

    while (this.index < this.input.length) {
      if (this.startsWith("</")) {
        this.index += 2;
        const closing = this.readName();
        this.skipSpaces();
        this.expect(">");
        if (closing !== name) throw new Error("mismatched tag");
        return element;
      }
      if (this.startsWith("<!--")) {
        this.skipComment();
        continue;
      }
      if (this.startsWith("<?")) throw new Error("processing instruction");
      if (this.startsWith("<![")) throw new Error("cdata forbidden");
      if (this.peek() === "<") {
        element.children.push(this.parseElement(element, depth + 1));
        continue;
      }
      const text = this.readText();
      if (text !== "") element.children.push(text);
    }
    throw new Error("unclosed tag");
  }

  private readAttribute(element: XmlElement) {
    const name = this.readName();
    this.skipSpaces();
    this.expect("=");
    this.skipSpaces();
    const quote = this.peek();
    if (quote !== '"' && quote !== "'") throw new Error("invalid attribute");
    this.index += 1;
    const start = this.index;
    while (this.index < this.input.length && this.peek() !== quote) {
      if (this.peek() === "<") throw new Error("invalid attribute");
      this.index += 1;
    }
    const raw = this.input.slice(start, this.index);
    this.expect(quote);
    const value = decodeEntities(raw);
    if (name === "xmlns" || name.startsWith("xmlns:")) {
      const prefix = name === "xmlns" ? "" : name.slice("xmlns:".length);
      if (prefix.includes(":")) throw new Error("invalid namespace");
      if (element.nsDecls.some((decl) => decl.prefix === prefix)) throw new Error("duplicate namespace");
      element.nsDecls.push({ prefix, uri: value });
      return;
    }
    if (element.attrs.some((attr) => attr.name === name)) throw new Error("duplicate attribute");
    const colon = name.indexOf(":");
    element.attrs.push({
      name,
      prefix: colon === -1 ? "" : name.slice(0, colon),
      localName: colon === -1 ? name : name.slice(colon + 1),
      value,
    });
  }

  private readText(): string {
    const start = this.index;
    while (this.index < this.input.length && this.peek() !== "<") this.index += 1;
    return decodeEntities(this.input.slice(start, this.index));
  }

  private skipProlog() {
    this.skipMisc();
    if (this.startsWith("<?xml")) {
      const end = this.input.indexOf("?>", this.index);
      if (end === -1) throw new Error("invalid xml declaration");
      this.index = end + 2;
      this.skipMisc();
    }
  }

  private skipMisc() {
    while (this.index < this.input.length) {
      if (this.isSpace(this.peek())) {
        this.index += 1;
        continue;
      }
      if (this.startsWith("<!--")) {
        this.skipComment();
        continue;
      }
      break;
    }
  }

  private skipComment() {
    const end = this.input.indexOf("-->", this.index + 4);
    if (end === -1) throw new Error("unclosed comment");
    if (this.input.slice(this.index + 4, end).includes("--")) throw new Error("invalid comment");
    this.index = end + 3;
  }

  private readName(): string {
    const start = this.index;
    const first = this.peek();
    if (!/^[A-Za-z_]$/.test(first)) throw new Error("invalid name");
    this.index += 1;
    while (this.index < this.input.length && /^[A-Za-z0-9._:-]$/.test(this.peek())) this.index += 1;
    const name = this.input.slice(start, this.index);
    if (name.split(":").length > 2) throw new Error("invalid name");
    return name;
  }

  private skipSpaces() {
    while (this.index < this.input.length && this.isSpace(this.peek())) this.index += 1;
  }

  private isSpace(char: string) {
    return char === " " || char === "\t" || char === "\n" || char === "\r";
  }

  private startsWith(token: string) {
    return this.input.startsWith(token, this.index);
  }

  private peek() {
    return this.input[this.index] ?? "";
  }

  private expect(token: string) {
    if (!this.startsWith(token)) throw new Error("invalid xml");
    this.index += token.length;
  }
}

function decodeEntities(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "&") {
      output += char;
      continue;
    }
    const semi = value.indexOf(";", index + 1);
    if (semi === -1 || semi - index > 16) throw new Error("bad entity");
    const token = value.slice(index + 1, semi);
    output += decodeEntityToken(token);
    index = semi;
  }
  return output;
}

function decodeEntityToken(token: string): string {
  if (token === "lt") return "<";
  if (token === "gt") return ">";
  if (token === "amp") return "&";
  if (token === "quot") return '"';
  if (token === "apos") return "'";
  if (token.startsWith("#x") || token.startsWith("#X")) return xmlChar(Number.parseInt(token.slice(2), 16));
  if (token.startsWith("#")) return xmlChar(Number.parseInt(token.slice(1), 10));
  throw new Error("bad entity");
}

function xmlChar(codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) throw new Error("bad entity");
  const allowed =
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff);
  if (!allowed) throw new Error("bad entity");
  return String.fromCodePoint(codePoint);
}
