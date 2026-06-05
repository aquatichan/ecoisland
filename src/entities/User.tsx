import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy as fbOrderBy, limit as fbLimit, getDocs } from 'firebase/firestore';

export const User = {
  async me() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (!user) {
          reject(new Error('Not authenticated'));
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          const defaultData = {
            id: user.uid,
            email: user.email,
            full_name: user.displayName || 'Anonymous User',
            username: user.displayName || 'Anonymous User',
            treecoins: 0,
            xp: 0,
            xp_to_next_level: 25,
            eco_level: 1,
            avatar_url: user.photoURL || '',
            onboarding_complete: false,
            verification_status: 'pending',
            preferences: {
              theme: 'light',
              weight_unit: 'kg',
              distance_unit: 'km',
              temperature_unit: 'celsius'
            },
            island_items: [],
            created_date: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), defaultData);
          resolve(defaultData);
        } else {
          const userData = { id: user.uid, ...userDoc.data() };
          
          resolve(userData);
        }
      });
    });
  },

  async updateMyUserData(updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      updated_date: new Date().toISOString()
    });
    
    return this.me();
  },

  async login() {
    await signInWithPopup(auth, googleProvider);
    return this.me;
  },

  async logout() {
    await signOut(auth);
    window.location.href = '/';
  },

  async list(sortField = '-treecoins', limitNum = 100) {
    const usersRef = collection(db, 'users');
    const field = sortField.replace('-', '');
    const direction = sortField.startsWith('-') ? 'desc' : 'asc';
    
    const q = query(usersRef, fbOrderBy(field, direction), fbLimit(limitNum));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};
