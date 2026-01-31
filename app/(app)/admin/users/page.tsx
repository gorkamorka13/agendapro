'use client';

import { useState, useEffect } from 'react';
import { User, Role } from '@prisma/client';
import { useTitle } from '@/components/TitleContext';
import { Save, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { getContrastColor } from '@/lib/utils';

export default function UserManagementPage() {
  const { setTitle } = useTitle();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER' as any);
  const [hourlyRate, setHourlyRate] = useState('');
  const [travelCost, setTravelCost] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    setTitle("Gestion des Utilisateurs");
  }, [setTitle]);

  const resetForm = () => {
    setName('');
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('USER' as any);
    setHourlyRate('');
    setTravelCost('');
    setColor('#3b82f6');
    setEditingUser(null);
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setName(user.name || '');
      setFullName((user as any).fullName || '');
      setEmail(user.email || '');
      setPhone((user as any).phone || '');
      setRole(user.role);
      setHourlyRate(user.hourlyRate?.toString() || '');
      setTravelCost(user.travelCost?.toString() || '');
      setColor(user.color || '#3b82f6');
      setPassword(''); // Password stays empty unless changing
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    const body: any = { name, fullName, email, phone, role, hourlyRate, travelCost, color };
    if (password) body.password = password;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const errorText = await res.text();
        alert(`Erreur: ${errorText}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
      try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
          fetchUsers();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="container mx-auto transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex-1">
          {/* Titre supprimé comme demandé */}
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 text-sm font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>Nouveau compte</span>
        </button>
      </div>

      {/* MOBILE VIEW: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400 font-medium">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400 font-medium">Aucun utilisateur trouvé.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full shadow-inner border-2 border-white dark:border-slate-700 shrink-0 flex items-center justify-center font-bold text-sm" style={{ backgroundColor: user.role === ('VISITEUR' as any) ? '#cbd5e1' : ((user as any).color || '#3b82f6'), color: getContrastColor(user.role === ('VISITEUR' as any) ? '#cbd5e1' : ((user as any).color || '#3b82f6')) }}>
                    {(user.name || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nom</div>
                    <div className="font-black text-slate-800 dark:text-slate-100 truncate">{(user as any).fullName || '-'}</div>
                    <div className="mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Login:</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{user.name}</span>
                    </div>
                    {((user as any).phone) && (
                      <div className="mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Tél:</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{(user as any).phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${user.role === ('ADMIN' as any) ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                  user.role === ('VISITEUR' as any) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                  {user.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Taux Horaire</div>
                  <div className="text-sm font-black text-slate-700 dark:text-slate-200">{(user as any).hourlyRate?.toFixed(2)} €/h</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Frais Déplacement</div>
                  <div className="text-sm font-black text-slate-700 dark:text-slate-200">{(user as any).travelCost?.toFixed(2)} €</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                <button
                  onClick={() => handleOpenModal(user)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm transition-colors border border-slate-100 dark:border-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.36 6.036l-6.68 6.68a2 2 0 00-.586 1.414l-.586 3.586 3.586-.586a2 2 0 001.414-.586l6.68-6.68-2.828-2.828z" />
                  </svg>
                  Modifier
                </button>
                {user.name !== 'admin' && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="flex items-center justify-center gap-2 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition-colors border border-red-100 dark:border-red-900/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Login</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle & Droits</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarification</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full shadow-inner border-2 border-white dark:border-slate-800 mr-4 shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center font-bold text-sm" style={{ backgroundColor: user.role === ('VISITEUR' as any) ? '#cbd5e1' : ((user as any).color || '#3b82f6'), color: getContrastColor(user.role === ('VISITEUR' as any) ? '#cbd5e1' : ((user as any).color || '#3b82f6')) }}>
                      {(user.name || '?').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100">{user.name}</div>
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{(user as any).fullName || '-'}</div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{user.email || '-'}</div>
                  {(user as any).phone && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tél</span>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{(user as any).phone}</div>
                    </div>
                  )}
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className={`px-2.5 py-1 inline-flex text-[10px] leading-4 font-black rounded-md uppercase tracking-wider ${user.role === ('ADMIN' as any) ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                    user.role === ('VISITEUR' as any) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm">
                  <div className="font-bold text-slate-700 dark:text-slate-200">{(user as any).hourlyRate?.toFixed(2)} €/h</div>
                  <div className="text-[10px] text-slate-400 font-medium">Frais: {(user as any).travelCost?.toFixed(2)} €/int.</div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform opacity-70 group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenModal(user)}
                      className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Modifier"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.36 6.036l-6.68 6.68a2 2 0 00-.586 1.414l-.586 3.586 3.586-.586a2 2 0 001.414-.586l6.68-6.68-2.828-2.828z" />
                      </svg>
                    </button>
                    {user.name !== 'admin' && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL stack */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-800 dark:text-slate-100">
              <div>
                <h3 className="text-xl font-black tracking-tight">
                  {editingUser ? 'Modifier le compte' : 'Nouveau compte'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Configurez les accès et préférences.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifiant (Login)</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
                    placeholder="ex: marie, admin"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
                    placeholder="ex: Marie Lefebvre"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Optionnel)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-medium"
                    placeholder="exemple@agendapro.fr"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone (Optionnel)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-medium"
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mot de passe {editingUser && '(laisser vide si inchangé)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Select
                    label="Rôle"
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as Role;
                      setRole(newRole);
                      if (newRole === 'VISITEUR') {
                        setColor('#cbd5e1');
                      }
                    }}
                  >
                    <option value="USER">Intervenant</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="VISITEUR">Visiteur</option>
                  </Select>
                </div>
                {role !== 'VISITEUR' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Couleur Calendrier</label>
                    <div className="flex items-center gap-3 h-10.5">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-10 w-full p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                      />
                    </div>
                    {users.some(u => u.color === color && u.id !== editingUser?.id) && (
                      <p className="text-[9px] text-red-500 font-bold animate-pulse">Couleur déjà utilisée !</p>
                    )}
                  </div>
                )}
                {role !== 'VISITEUR' && name !== 'admin' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Taux Horaire (€/h)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Frais Déplacement (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={travelCost}
                        onChange={(e) => setTravelCost(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-lg shadow-blue-200 dark:shadow-none transition flex items-center justify-center gap-2 order-1"
                >
                  <Save size={18} />
                  {editingUser ? 'Enregistrer' : 'Créer le compte'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 order-2"
                >
                  <X size={18} /> Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
