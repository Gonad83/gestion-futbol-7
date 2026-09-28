import { supabase } from './supabase';

// El nombre del equipo y el remitente los pone el servidor, según el equipo
// del jugador: antes decía "Real Ébolo FC" fijo para cualquier equipo.
async function callSendEmail(type: string, to: string, data: Record<string, any>) {
  const { error } = await supabase.functions.invoke('send-email', {
    body: { type, to, data },
  });
  if (error) console.error('sendEmail error:', error);
  return !error;
}

export const sendWelcomeEmail = (to: string, playerName: string, joinCode: string) =>
  callSendEmail('welcome', to, { playerName, joinCode });

export const sendNewMatchEmail = (to: string, playerName: string, date: string, location: string, confirmUrl: string, declineUrl: string) =>
  callSendEmail('new_match', to, { playerName, date, location, confirmUrl, declineUrl });

export const sendMatchReminder = (to: string, playerName: string, date: string, location: string, confirmUrl: string, declineUrl: string) =>
  callSendEmail('match_reminder', to, { playerName, date, location, confirmUrl, declineUrl });

export const sendPaymentReminder = (to: string, playerName: string, months: string[], totalDebt: string, paymentLink?: string) =>
  callSendEmail('payment_reminder', to, { playerName, months, totalDebt, paymentLink });
