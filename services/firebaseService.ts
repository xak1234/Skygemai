import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { Agent, FirebaseConfig, Message, Mission } from '../types';

// --- IMPORTANT ---
// To enable Firebase, enter your configuration details here.
// You can get these from your Firebase project settings.
const firebaseConfig: FirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app: FirebaseApp | null = null;
let db: any = null; // Use 'any' to avoid type conflicts with different firestore versions

// Check if the config has been filled out
const isConfigured = (): boolean => {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

if (isConfigured()) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } catch(e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("Firebase is not configured. Persistence will be disabled. Please update services/firebaseService.ts");
}

const missionsCollection = isConfigured() ? collection(db, 'missions') : null;

export const createMission = async (data: { objective: string, githubUrl: string, agents: Agent[] }): Promise<string> => {
    if (!missionsCollection) throw new Error("Firebase not configured");
    const docRef = await addDoc(missionsCollection, {
        ...data,
        status: 'running',
        createdAt: serverTimestamp(),
        finalOutput: ''
    });
    return docRef.id;
};

export const addLogMessage = async (missionId: string, message: Message): Promise<void> => {
    if (!missionsCollection) return;
    try {
        const logsCollection = collection(db, `missions/${missionId}/logs`);
        await addDoc(logsCollection, message);
    } catch (error) {
        console.error("Failed to log message to Firebase:", error);
    }
};

export const updateMissionStatus = async (missionId: string, status: 'completed' | 'error', finalOutput?: string): Promise<void> => {
    if (!missionsCollection) return;
    const missionDoc = doc(db, 'missions', missionId);
    await updateDoc(missionDoc, { status, finalOutput: finalOutput || '' });
};

export const getMissions = async (): Promise<Mission[]> => {
    if (!missionsCollection) return [];
    const q = query(missionsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as Mission;
    });
};

export const getMission = async (missionId: string): Promise<Mission | null> => {
    if (!missionsCollection) return null;
    const missionDoc = await getDoc(doc(db, 'missions', missionId));
    if (!missionDoc.exists()) return null;
    const data = missionDoc.data();
    return {
        id: missionDoc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    } as Mission;
}

export const getMissionLogs = async (missionId: string): Promise<Message[]> => {
    if (!missionsCollection) return [];
    const logsCollection = collection(db, `missions/${missionId}/logs`);
    const q = query(logsCollection, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Message);
};

export { isConfigured };
