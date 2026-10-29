// PDFStorage: Bộ lưu trữ file PDF cục bộ không giới hạn dung lượng bằng IndexedDB
// Giúp lưu file PDF thực tế của giáo viên bền vững, không bị giới hạn 5MB của LocalStorage

const PDFStorage = {
  dbName: 'THPT_Math_Exam_PDF_DB',
  storeName: 'exam_pdf_blobs',
  dbPromise: null,

  getDB() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
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

  async savePdf(examId, blobOrFile) {
    try {
      const db = await this.getDB();
      if (!db) return false;
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

  async getPdfBlobUrl(examId) {
    try {
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(examId);
        req.onsuccess = () => {
          const result = req.result;
          if (result instanceof Blob) {
            resolve(URL.createObjectURL(result));
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.error('Lỗi khi đọc PDF từ IndexedDB:', e);
      return null;
    }
  },

  async deletePdf(examId) {
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve, reject) => {
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
