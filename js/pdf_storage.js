// PDFStorage: Bộ lưu trữ file PDF siêu tốc (RAM Cache 0ms + IndexedDB bền vững không giới hạn dung lượng)

const PDFStorage = {
  dbName: 'THPT_Math_Exam_PDF_DB',
  storeName: 'exam_pdf_blobs',
  dbPromise: null,
  memCache: new Map(),

  getDB() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.error('Lỗi khởi tạo IndexedDB:', req.error);
          resolve(null);
        };
      });
    }
    return this.dbPromise;
  },

  _putMem(examId, blob) {
    if (!examId || !blob) return;
    const prev = this.memCache.get(examId);
    if (prev && prev.url && prev.blob !== blob && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try { URL.revokeObjectURL(prev.url); } catch (_) {}
    }
    const keptUrl = (prev && prev.blob === blob) ? prev.url : null;
    this.memCache.set(examId, { blob, url: keptUrl });
  },

  getCachedBlobUrlSync(examId) {
    if (!examId) return '';
    const entry = this.memCache.get(examId);
    if (!entry || !entry.blob) return '';
    if (!entry.url && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      entry.url = URL.createObjectURL(entry.blob);
    }
    return entry.url || '';
  },

  hasMemBlob(examId) {
    return Boolean(examId && this.memCache.has(examId));
  },

  async savePdf(examId, blobOrFile) {
    if (!examId || !blobOrFile) return false;
    this._putMem(examId, blobOrFile);
    try {
      const db = await this.getDB();
      if (!db) return true;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(blobOrFile, examId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('Lỗi khi lưu PDF vào IndexedDB:', e);
      return false;
    }
  },

  async getPdfBlob(examId) {
    try {
      if (!examId) return null;
      const mem = this.memCache.get(examId);
      if (mem && mem.blob) return mem.blob;
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(examId);
        req.onsuccess = () => {
          const result = req.result;
          const valid = (typeof Blob !== 'undefined' && result instanceof Blob) ? result : null;
          if (valid) this._putMem(examId, valid);
          resolve(valid);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.error('Lỗi khi đọc Blob PDF từ IndexedDB:', e);
      return null;
    }
  },

  async getPdfBlobUrl(examId) {
    const syncUrl = this.getCachedBlobUrlSync(examId);
    if (syncUrl) return syncUrl;
    const blob = await this.getPdfBlob(examId);
    if (!blob) return null;
    this._putMem(examId, blob);
    return this.getCachedBlobUrlSync(examId) || null;
  },

  async deletePdf(examId) {
    if (examId && this.memCache.has(examId)) {
      const prev = this.memCache.get(examId);
      if (prev && prev.url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try { URL.revokeObjectURL(prev.url); } catch (_) {}
      }
      this.memCache.delete(examId);
    }
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(examId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  },

  async clearAllPdfs() {
    this.memCache.forEach((entry) => {
      if (entry && entry.url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try { URL.revokeObjectURL(entry.url); } catch (_) {}
      }
    });
    this.memCache.clear();
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFStorage;
}
