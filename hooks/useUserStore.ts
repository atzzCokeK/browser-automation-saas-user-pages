"use client";

import { useSyncExternalStore } from "react";
import { users, type User } from "@/data/users";

export type NewUser = Omit<User, "id">;

type UserStore = {
  addedUsers: readonly User[];
  deletedIds: ReadonlySet<number>;
};

// 追加・削除はブラウザのメモリだけに持つため、リロードすると元の一覧に戻る。
const EMPTY_STORE: UserStore = { addedUsers: [], deletedIds: new Set() };
let store: UserStore = EMPTY_STORE;
let nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;

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

export function addUser(user: NewUser) {
  store = {
    ...store,
    addedUsers: [{ ...user, id: nextId++ }, ...store.addedUsers],
  };
  notify();
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
