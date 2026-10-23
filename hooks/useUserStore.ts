import { useSyncExternalStore } from "react";
import { users, type User } from "@/data/users";

export type NewUser = Omit<User, "id">;
export type UserUpdate = Partial<Omit<User, "id">>;

type UserStore = {
  addedUsers: readonly User[];
  deletedIds: ReadonlySet<number>;
  updates: ReadonlyMap<number, UserUpdate>;
};

// 追加・更新・削除はブラウザのメモリだけに持つため、リロードすると元の一覧に戻る。
const EMPTY_STORE: UserStore = {
  addedUsers: [],
  deletedIds: new Set(),
  updates: new Map(),
};
let store: UserStore = EMPTY_STORE;
let nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;

// 画面遷移をまたいで 1 度だけ表示する通知。購読は不要なので snapshot には含めない。
let notification: string | null = null;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return store;
}

function getServerSnapshot() {
  return EMPTY_STORE;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function applyUserUpdate(user: User, update: UserUpdate | undefined): User {
  if (!update) return user;
  return { ...user, ...update, id: user.id };
}

export function mergeStoredUsers(
  snapshot: UserStore = store,
  seeded: readonly User[] = users,
): User[] {
  return [...snapshot.addedUsers, ...seeded]
    .filter((user) => !snapshot.deletedIds.has(user.id))
    .map((user) => applyUserUpdate(user, snapshot.updates.get(user.id)));
}

export function findUser(
  snapshot: UserStore,
  id: number,
  seeded: readonly User[] = users,
): User | undefined {
  if (!Number.isInteger(id) || snapshot.deletedIds.has(id)) return undefined;
  const base =
    snapshot.addedUsers.find((user) => user.id === id) ??
    seeded.find((user) => user.id === id);
  if (!base) return undefined;
  return applyUserUpdate(base, snapshot.updates.get(id));
}

function userExists(id: number): boolean {
  if (store.deletedIds.has(id)) return false;
  return (
    store.addedUsers.some((user) => user.id === id) ||
    users.some((user) => user.id === id)
  );
}

export function addUser(user: NewUser) {
  store = {
    ...store,
    addedUsers: [{ ...user, id: nextId++ }, ...store.addedUsers],
  };
  notify();
}

export function updateUser(id: number, updatedFields: UserUpdate) {
  if (!userExists(id)) return;

  const updates = new Map(store.updates);
  updates.set(id, { ...updates.get(id), ...updatedFields });
  store = { ...store, updates };
  notify();
}

export function setNotification(message: string) {
  notification = message;
}

export function consumeNotification() {
  const message = notification;
  notification = null;
  return message;
}

export function deleteUser(id: number) {
  const deletedIds = new Set(store.deletedIds);
  deletedIds.add(id);
  store = { ...store, deletedIds };
  notify();
}

export function useUserStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
