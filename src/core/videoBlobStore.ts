const DB_NAME = 'clipcard_video_blobs';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

interface StoredVideoBlob {
  blobKey: string;
  videoId: string;
  blob: Blob;
  fileName?: string;
  mimeType?: string;
  updatedAt: number;
}

function getBlobKey(videoId: string) {
  return `video_blob_${videoId || 'demo'}`;
}

function openVideoDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('当前浏览器不支持 IndexedDB。'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'blobKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打开失败。'));
  });
}

function runVideoStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    openVideoDb()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = action(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('视频 Blob 存储操作失败。'));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error('视频 Blob 存储事务失败。'));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error('视频 Blob 存储事务中断。'));
        };
      })
      .catch(reject);
  });
}

export async function saveVideoBlob(videoId: string, file: Blob & { name?: string }) {
  const blobKey = getBlobKey(videoId);
  await runVideoStore('readwrite', (store) => store.put({
    blobKey,
    videoId,
    blob: file,
    fileName: file.name,
    mimeType: file.type,
    updatedAt: Date.now(),
  } satisfies StoredVideoBlob));
  return blobKey;
}

export async function getVideoBlob(videoIdOrBlobKey: string) {
  const blobKey = videoIdOrBlobKey.startsWith('video_blob_') ? videoIdOrBlobKey : getBlobKey(videoIdOrBlobKey);
  const record = await runVideoStore<StoredVideoBlob | undefined>('readonly', (store) => store.get(blobKey));
  return record?.blob ?? null;
}

export async function deleteVideoBlob(videoIdOrBlobKey: string) {
  const blobKey = videoIdOrBlobKey.startsWith('video_blob_') ? videoIdOrBlobKey : getBlobKey(videoIdOrBlobKey);
  await runVideoStore('readwrite', (store) => store.delete(blobKey));
}

export async function createVideoObjectUrl(videoIdOrBlobKey: string) {
  const blob = await getVideoBlob(videoIdOrBlobKey);
  return blob ? URL.createObjectURL(blob) : null;
}
