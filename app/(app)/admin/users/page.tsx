'use client';

import { useState, useEffect } from 'react';
import { User, Role } from '@prisma/client';
import { useTitle } from '@/components/TitleContext';

export default function UserManagementPage() {
  const { setTitle } = useTitle();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.USER);
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
    setEmail('');
    setPassword('');
    setRole(Role.USER);
    setHourlyRate('');
    setTravelCost('');
    setColor('#3b82f6');
    setEditingUser(null);
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setName(user.name || '');
      setEmail(user.email || '');
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

    const body: any = { name, email, role, hourlyRate, travelCost, color };
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
      <div className="flex justify-end mb-6">
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center gap-2 text-sm sm:text-base font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>Nouveau</span>
        </button>
      </div>

      {/* MOBILE VIEW: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400">Aucun utilisateur trouvé.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: user.color || '#3b82f6' }} />
                  <div>
                    <div className="font-black text-slate-800 dark:text-slate-100">{user.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-tight ${
                  user.role === Role.ADMIN ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {user.role}
                </span>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mb-4 flex justify-between items-center">
                <span className="font-bold">{user.hourlyRate?.toFixed(2)} €/h</span>
                <span className="text-xs italic">Frais: {user.travelCost?.toFixed(2)} €</span>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t dark:border-slate-700 pt-3">
                <button
                  onClick={() => handleOpenModal(user)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.36 6.036l-6.68 6.68a2 2 0 00-.586 1.414l-.586 3.586 3.586-.586a2 2 0 001.414-.586l6.68-6.68-2.828-2.828z" />
                  </svg>
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-slate-700 scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tarif/Frais</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm font-medium text-gray-900 dark:text-slate-200">
                    <div className="w-8 h-8 rounded-full shadow-inner border border-white/20 mr-3 shrink-0" style={{ backgroundColor: (user as any).color || '#3b82f6' }} />
                    <div>
                      <div className="text-sm font-bold">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === Role.ADMIN ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                  <div>{user.hourlyRate?.toFixed(2)} €/h</div>
                  <div className="text-xs">Frais: {user.travelCost?.toFixed(2)} €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                     <button
                      onClick={() => handleOpenModal(user)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.36 6.036l-6.68 6.68a2 2 0 00-.586 1.414l-.586 3.586 3.586-.586a2 2 0 001.414-.586l6.68-6.68-2.828-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border dark:border-slate-800">
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                {editingUser ? 'Modifier' : 'Nouvel'} Utilisateur
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nom (Identifiant)</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-slate-100"
                    placeholder="ex: admin, marie"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-slate-100"
                    placeholder="exemple@agendastable.fr"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Mot de passe {editingUser && '(laissez vide pour ne pas changer)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-slate-100"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-slate-100"
                  >
                    <option value={Role.USER}>Utilisateur (Intervenant)</option>
                    <option value={Role.ADMIN}>Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Tarif Horaire (€/h)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-slate-100"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1">
                   <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Frais de déplacement (€/intervention)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={travelCost}
                    onChange={(e) => setTravelCost(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-slate-100"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Couleur</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-full p-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg transition"
                >
                  {editingUser ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
