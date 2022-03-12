// deno-lint-ignore-file no-explicit-any
import { SQLTransaction } from './SQLTransaction.ts'
import { cache } from './SQLiteDBCache.ts'
import type { TxMode } from './SQLiteDBCache.ts'

export class Database {
  #name: string
  #version: string

  constructor (name: string, version: string, _displayName: string, _estimatedSize: number) {
    this.#name = name
    this.#version = version
  }

  #doTransaction<T = any> (txMode: TxMode, callback: TransactionCallback<T>, errorCallback?: (err: any) => any, successCallback?: () => any) {
    // console.log('zoinks', new Error(this.#name))
    queueMicrotask(() => {
      try {
        const db = cache.db(this.#name, txMode)
        const transaction = new SQLTransaction<T>(db)

        try {
          callback(transaction)

          if (successCallback) successCallback()
        } catch (error) {
          if (errorCallback) errorCallback(error)
        }
      } catch (error) {
        if (errorCallback) errorCallback(error)
      }
    })
  }

  transaction<T = any> (callback: TransactionCallback<T>, errorCallback?: (err: any) => any, successCallback?: () => any) {
    this.#doTransaction('create', callback, errorCallback, successCallback)
  }

  readTransaction<T = any> (callback: TransactionCallback<T>, errorCallback?: (err: any) => any, successCallback?: () => any) {
    this.#doTransaction('read', callback, errorCallback, successCallback)
  }

  get version (): string {
    return this.#version
  }

  changeVersion (oldVersion: string, newVersion: string, callback?: TransactionCallback, errorCallback?: (err: any) => any, successCallback?: () => any) {
    if (oldVersion === this.#version) {
      this.#version = newVersion
      if (callback) this.#doTransaction('write', callback, errorCallback, successCallback)
    }
  }
}

/** Implements the openDatabase function per the WebSQL spec. */
export function openDatabase (name: string, version: string, displayName: string, estimatedSize: number) {
  return new Database(name, version, displayName, estimatedSize)
}

export type TransactionCallback<T = any> = (tx: SQLTransaction<T>) => any
