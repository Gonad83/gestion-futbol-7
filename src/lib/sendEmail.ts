import { supabase } from './supabase';

const TEAM_NAME = 'Real Ébolo FC';

async function callSendEmail(type: string, to: string, data: Record<string, any>) {
  const { error } = await supabase.functions.invoke('send-email', {
    body: { type, to, data: { ...data, teamName: TEAM_NAME } },
  });
  if (error) console.error('sendEmail error:', error);
  return !error;
}

export const sendWelcomeEmail = (to: string, playerName: string, joinCode: string) =>
  callSendEmail('welcome', to, { playerName, joinCode });

export const sendMatchReminder = (to: string, playerName: string, date: string, location: string, confirmUrl: string, declineUrl: string) =>
  callSendEmail('match_reminder', to, { playerName, date, location, confirmUrl, declineUrl });

export const sendPaymentReminder = (to: string, playerName: string, months: string[], totalDebt: string, paymentLink?: string) =>
  callSendEmail('payment_reminder', to, { playerName, months, totalDebt, paymentLink });

export const sendPasswordReset = (to: string, resetLink: string) =>
  callSendEmail('password_reset', to, { resetLink });
