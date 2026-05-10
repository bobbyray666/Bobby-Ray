import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveAppProject(appData: any, files: any[]) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const appId = appData.id || doc(collection(db, 'apps')).id;
  const appRef = doc(db, 'apps', appId);
  
  // Strip files from the main document to keep it small and follow rules
  const { files: _, ...projectMetadata } = appData;
  
  const existingDoc = await getDoc(appRef);
  const existingData = existingDoc.exists() ? existingDoc.data() : null;
  
  try {
    const batch = writeBatch(db);
    
    batch.set(appRef, {
      ...projectMetadata,
      id: appId,
      ownerId: auth.currentUser.uid,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Save version snapshot
    const versionId = doc(collection(db, 'apps', appId, 'versions')).id;
    const versionRef = doc(db, 'apps', appId, 'versions', versionId);
    batch.set(versionRef, {
      version: appData.version || 'v1.0.0',
      summary: appData.summary || '',
      timestamp: serverTimestamp(),
      filesHash: btoa(JSON.stringify(files.map(f => f.path))).substring(0, 32),
    });
    
    // In a real app, we might want to clear old files or handle atomic updates
    for (const file of files) {
      const fileId = btoa(file.path).replace(/[/+=]/g, '_');
      const fileRef = doc(db, 'apps', appId, 'files', fileId);
      batch.set(fileRef, {
        ...file,
        appId: appId,
      });
    }
    
    await batch.commit();
    return appId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `apps/${appId}`);
  }
}

export async function deleteAppProject(appId: string) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  try {
    const batch = writeBatch(db);
    
    // Delete main document
    batch.delete(doc(db, 'apps', appId));
    
    // In a production app, we'd also delete subcollections or use a cloud function
    // For this implementation, we'll assume the main doc deletion is enough for the UI to clear it
    // but typically we'd fetch and delete all files/versions too if we wanted full cleanup.
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `apps/${appId}`);
  }
}

export async function getUserApps() {
  if (!auth.currentUser) return [];
  const q = query(collection(db, 'apps'), where('ownerId', '==', auth.currentUser.uid));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'apps');
  }
}

export async function getAppFiles(appId: string) {
  if (!auth.currentUser) return [];
  const filesRef = collection(db, 'apps', appId, 'files');
  try {
    const snapshot = await getDocs(filesRef);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `apps/${appId}/files`);
  }
}

export async function getAppVersions(appId: string) {
  if (!auth.currentUser) return [];
  const versionsRef = collection(db, 'apps', appId, 'versions');
  try {
    const snapshot = await getDocs(versionsRef);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id })).sort((a: any, b: any) => b.timestamp?.seconds - a.timestamp?.seconds) as any[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `apps/${appId}/versions`);
  }
}
