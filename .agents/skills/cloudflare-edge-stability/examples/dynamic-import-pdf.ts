// Exemple d'import dynamique sécurisé pour jsPDF (Client-side)
// Ce code évite que Cloudflare n'essaie d'exécuter jsPDF côté serveur (SSR)
// ce qui causerait une erreur "window is not defined".

export async function handleGeneratePDF(data: any) {
  // Chargement à la demande
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  // Utilisation de autoTable
  (doc as any).autoTable({
    head: [['Nom', 'Date', 'Statut']],
    body: data.map(item => [item.name, item.date, item.status]),
  });

  doc.save('rapport.pdf');
}
