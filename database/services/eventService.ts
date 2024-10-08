import * as SQLite from 'expo-sqlite';
import { subtractBudget } from './budgetService';
import { format,parse } from 'date-fns';
import { getCurrentBudget,addCurrentBudget } from './budgetService';

interface Event {
  event_name: string;
  date: string;
  start: string;
  end: string;
  alloted: number;
  budgetLimit: number;
  currentBudget: number;
}

const formatTime = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'h:mm a');
};

const convertTo24HourFormat = (time: string): Date => {
  const date = new Date();
  return parse(time, 'h:mm a', date); // Use 'h:mm a' for 12-hour format with AM/PM
};

const db = SQLite.openDatabaseSync('fundflow.db');
const today = new Date().toISOString().split('T')[0];

interface eventResult {
  total_count: number;
  allEvent:any;
}

export const addEvent = async (event : any) => {
  const formattedTimeStart = formatTime(event.timeStart);
  const formattedTimeEnd = formatTime(event.timeEnd);
   await db.runAsync(`
        INSERT INTO event (event_name, date, start, end, alloted, budgetLimit, currentBudget)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        event.eventName,
        event.date,
        formattedTimeStart,
        formattedTimeEnd,
        event.allocatedBudgetValue,
        event.budgetLimitValue,
        event.allocatedBudgetValue
      ]);
    await subtractBudget(event.allocatedBudgetValue)
} 

export const getTodaysEvent = async (): Promise<{ total_count: number; all_events: Event[] }> => {
  const totalEvent: { total_count?: number } | null = await db.getFirstAsync(`SELECT COUNT(*) AS total_count FROM event WHERE date = ?`, today);
  const allEvent = await db.getAllAsync(`SELECT * FROM event WHERE date = ?`, today) as Event[];
  
  const total_count = totalEvent?.total_count || 0;

  const sortedEvents = allEvent.sort((a, b) => {
      const timeA = convertTo24HourFormat(a.start);
      const timeB = convertTo24HourFormat(b.start);
      return timeA.getTime() - timeB.getTime();
  });

  return {
      total_count,
      all_events: sortedEvents
  };
};

export const getEventsForMonth = async (monthNumber: number) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const formattedMonth = monthNumber < 10 ? `0${monthNumber}` : monthNumber;
  const today = currentDate.toISOString().split('T')[0];
  const formatText = `${currentYear}-${formattedMonth}%`;

  const events = await db.getAllAsync(`
    SELECT * FROM event 
    WHERE date LIKE ? AND date >= ?
    ORDER BY date ASC, start ASC
  `, [formatText, today]);

  const sortedEvents = events.sort((a: any, b: any) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }

    const timeA = convertTo24HourFormat(a.start);
    const timeB = convertTo24HourFormat(b.start);

    return timeA.getTime() - timeB.getTime();
  });

  return sortedEvents;
};

export const getEventHistory = async (monthNumber: number) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const formattedMonth = monthNumber < 10 ? `0${monthNumber}` : monthNumber;
  const today = currentDate.toISOString().split('T')[0];
  const formatText = `${currentYear}-${formattedMonth}%`;

  const events = await db.getAllAsync(`
    SELECT * FROM event 
    WHERE date LIKE ? AND date < ?  -- Exclude current date
    ORDER BY date ASC, start ASC
  `, [formatText, today]);

  const sortedEvents = events.sort((a: any, b: any) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }

    const timeA = convertTo24HourFormat(a.start);
    const timeB = convertTo24HourFormat(b.start);

    return timeA.getTime() - timeB.getTime();
  });

  return sortedEvents;
}

export const getAll = async () => {
  const allEvent  = await db.getAllAsync(`SELECT * FROM event`);
  console.log(allEvent);
}

export const deleteEvent = async (id: any, alloted:any) => {
  try {
    await db.runAsync(`DELETE FROM event WHERE event_id = ?`, [id]);
    let currentBudget = await getCurrentBudget();
    currentBudget += alloted;
    await addCurrentBudget(currentBudget);
  } catch (error) {
    console.error('Error deleting event:', error);
  }
};

export const editEvent = async (event:any,eventId:any) => {
  const formattedTimeStart = formatTime(event.startTime);
  const formattedTimeEnd = formatTime(event.endTime);
  await db.runAsync(
    `UPDATE event SET event_name = ?, date = ?, start = ?, end = ? WHERE event_id = ?`,
    event.newEventName,
    event.dateString,
    formattedTimeStart,
    formattedTimeEnd,
    eventId
  );
}