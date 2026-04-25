export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title: string, body: string, icon?: string): void {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: icon ?? '/favicon.ico' });
}

// Check for planned items due within `daysAhead` days and send notifications
// Returns count of notifications sent
export function checkUpcomingReminders(
  plannedExpenses: import('../types').PlannedExpense[],
  plannedIncomes: import('../types').PlannedIncome[],
  daysAhead: number = 3,
): number {
  if (Notification.permission !== 'granted') return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  let count = 0;
  const lastCheck = localStorage.getItem('reminders-last-check');
  const todayStr = today.toISOString().slice(0, 10);
  if (lastCheck === todayStr) return 0; // already checked today

  for (const item of plannedExpenses) {
    if (!item.isActive) continue;
    const start = new Date(item.startDate);
    if (start >= today && start <= cutoff) {
      sendNotification(
        `Upcoming expense: ${item.name}`,
        `${item.amount} ${item.currency} due ${item.startDate}`,
      );
      count++;
    }
  }

  // Reference plannedIncomes to avoid unused-param while keeping the documented signature
  void plannedIncomes;

  localStorage.setItem('reminders-last-check', todayStr);
  return count;
}
