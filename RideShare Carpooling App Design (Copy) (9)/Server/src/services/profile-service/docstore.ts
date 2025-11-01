interface Document {
  id: string;
  [key: string]: any;
}

interface Query {
  [key: string]: any;
}

class MockDocstore {
  private collections: Map<string, Document[]> = new Map();

  public async add(collectionName: string, document: Document): Promise<Document> {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, []);
    }
    const collection = this.collections.get(collectionName)!;
    const newDocument = { ...document, id: document.id || `doc-${Date.now()}-${collection.length}` };
    collection.push(newDocument);
    return newDocument;
  }

  public async get(collectionName: string, id: string): Promise<Document | undefined> {
    const collection = this.collections.get(collectionName);
    return collection ? collection.find(doc => doc.id === id) : undefined;
  }

  public async set(collectionName: string, id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const collection = this.collections.get(collectionName);
    if (collection) {
      const index = collection.findIndex(doc => doc.id === id);
      if (index > -1) {
        collection[index] = { ...collection[index], ...updates };
        return collection[index];
      }
    }
    return undefined;
  }

  public async query(collectionName: string, query: Query): Promise<Document[]> {
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
  }
}

export const docstore = new MockDocstore();
