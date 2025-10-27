"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docstore = void 0;
class MockDocstore {
    constructor() {
        this.collections = new Map();
    }
    add(collectionName, document) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.collections.has(collectionName)) {
                this.collections.set(collectionName, []);
            }
            const collection = this.collections.get(collectionName);
            const newDocument = Object.assign(Object.assign({}, document), { id: document.id || `doc-${Date.now()}-${collection.length}` });
            collection.push(newDocument);
            return newDocument;
        });
    }
    get(collectionName, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.collections.get(collectionName);
            return collection ? collection.find(doc => doc.id === id) : undefined;
        });
    }
    set(collectionName, id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.collections.get(collectionName);
            if (collection) {
                const index = collection.findIndex(doc => doc.id === id);
                if (index > -1) {
                    collection[index] = Object.assign(Object.assign({}, collection[index]), updates);
                    return collection[index];
                }
            }
            return undefined;
        });
    }
    query(collectionName, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.collections.get(collectionName);
            if (!collection) {
                return [];
            }
            return collection.filter(doc => {
                for (const key in query) {
                    if (doc[key] !== query[key]) {
                        return false;
                    }
                }
                return true;
            });
        });
    }
}
exports.docstore = new MockDocstore();
