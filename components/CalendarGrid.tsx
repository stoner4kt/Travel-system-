'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Booking, Vehicle } from '@/lib/storage';

interface CalendarGridProps {
  bookings: Booking[];
  vehicles: Vehicle[];
  onSelectDate: (date: Date) => void;
  onSelectBooking: (booking: Booking) => void;
}

const PALETTE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

export default function CalendarGrid({
  bookings,
  vehicles,
  onSelectDate,
  onSelectBooking
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of month index (0-6)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to normalize to start of day
  const getMidnight = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  // Generate complete grid dates including leading/trailing padding
  const firstDayIndexOffset = firstDayIndex;
  const totalSlots = Math.ceil((firstDayIndexOffset + daysInMonth) / 7) * 7;
  
  const gridDates: Date[] = [];
  for (let i = 0; i < totalSlots; i++) {
    gridDates.push(new Date(year, month, 1 - firstDayIndexOffset + i));
  }

  // Partition into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < gridDates.length; i += 7) {
    weeks.push(gridDates.slice(i, i + 7));
  }

  // Find active bookings on a specific date
  const getBookingsOnDate = (date: Date): Booking[] => {
    const checkTime = getMidnight(date);
    
    return bookings.filter(b => {
      const start = getMidnight(new Date(b.start_date));
      const end = getMidnight(new Date(b.end_date));
      return checkTime >= start && checkTime <= end;
    });
  };

  // Assign deterministic color
  const getBookingColor = (b: Booking) => {
    if (b.is_rented_vehicle) {
      return '#6366F1'; // Indigo for rented vehicles
    }
    const vehicle = vehicles.find(v => v.registration_no === b.assigned_vehicle_reg);
    if (vehicle?.color) {
      return vehicle.color;
    }
    const hash = b.invoice_no.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PALETTE_COLORS[hash % PALETTE_COLORS.length];
  };

  // Get and allocate tracks for bookings overlapping a week
  const getWeekTracks = (week: Date[]) => {
    const weekStart = getMidnight(week[0]);
    const weekEnd = getMidnight(week[6]);

    // Find all bookings overlapping with this week
    const weekBookings = bookings.filter(b => {
      const start = getMidnight(new Date(b.start_date));
      const end = getMidnight(new Date(b.end_date));
      return start <= weekEnd && end >= weekStart;
    });

    // Sort: earlier start first, longer duration second
    const sortedBookings = [...weekBookings].sort((a, b) => {
      const startA = getMidnight(new Date(a.start_date));
      const startB = getMidnight(new Date(b.start_date));
      if (startA !== startB) return startA - startB;

      const durationA = getMidnight(new Date(a.end_date)) - startA;
      const durationB = getMidnight(new Date(b.end_date)) - startB;
      return durationB - durationA;
    });

    const allocated: { 
      booking: Booking; 
      startCol: number; 
      endCol: number; 
      track: number;
      startsInWeek: boolean;
      endsInWeek: boolean;
    }[] = [];

    sortedBookings.forEach(booking => {
      const bookingStart = getMidnight(new Date(booking.start_date));
      const bookingEnd = getMidnight(new Date(booking.end_date));

      const startsInWeek = bookingStart >= weekStart;
      const endsInWeek = bookingEnd <= weekEnd;

      // Determine starting column index (0-6)
      let startCol = 0;
      if (startsInWeek) {
        for (let i = 0; i < 7; i++) {
          if (getMidnight(week[i]) === bookingStart) {
            startCol = i;
            break;
          }
        }
      }

      // Determine ending column index (0-6)
      let endCol = 6;
      if (endsInWeek) {
        for (let i = 0; i < 7; i++) {
          if (getMidnight(week[i]) === bookingEnd) {
            endCol = i;
            break;
          }
        }
      }

      // Find first available track
      let track = 0;
      while (true) {
        const overlaps = allocated.some(item => 
          item.track === track && 
          !(endCol < item.startCol || startCol > item.endCol)
        );
        if (!overlaps) {
          break;
        }
        track++;
      }

      allocated.push({
        booking,
        startCol,
        endCol,
        track,
        startsInWeek,
        endsInWeek
      });
    });

    return allocated;
  };

  const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-extrabold text-slate-850">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToToday}
            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-xs transition-all hover:bg-slate-50 text-slate-700"
          >
            Today
          </button>
          
          <div className="flex items-center border border-slate-200 rounded-lg bg-white shadow-xs overflow-hidden">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-50 border-r border-slate-100 transition-colors text-slate-600"
              title="Previous Month"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-50 transition-colors text-slate-600"
              title="Next Month"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Row */}
      <div className="grid grid-cols-7 border-b border-slate-100 text-center bg-slate-50/20">
        {dayLabels.map((day, idx) => (
          <div key={idx} className="py-3 text-[11px] font-extrabold text-slate-400 tracking-widest uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Weeks & Days Grid */}
      <div className="flex flex-col bg-slate-100/60 gap-[1px]">
        {weeks.map((week, weekIdx) => {
          const weekTracks = getWeekTracks(week);
          const maxTrack = weekTracks.reduce((max, t) => Math.max(max, t.track), -1);
          // Dynamically adjust height of week row based on total stacked tracks
          const rowHeightClass = maxTrack >= 4 ? 'min-h-[145px]' : 'min-h-[115px]';

          return (
            <div key={weekIdx} className={`relative bg-white ${rowHeightClass} transition-all duration-200`}>
              {/* Day cells grid */}
              <div className="grid grid-cols-7 h-full absolute inset-0">
                {week.map((date, dayIdx) => {
                  const isCurrentMonth = date.getMonth() === month;
                  const dayBookings = getBookingsOnDate(date);
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => onSelectDate(date)}
                      className={`p-2 flex flex-col justify-between hover:bg-slate-50/40 cursor-pointer transition-colors border-r border-slate-100/70 last:border-r-0 ${
                        !isCurrentMonth ? 'bg-slate-50/20' : ''
                      }`}
                    >
                      {/* Day Number and Dot Indicator */}
                      <div className="flex flex-col items-center self-start gap-1">
                        {isCurrentMonth ? (
                          <span
                            className={`text-xs font-extrabold rounded-full w-6 h-6 flex items-center justify-center transition-colors ${
                              isToday
                                ? 'bg-teal-600 text-white shadow-sm font-black'
                                : 'text-slate-700'
                            }`}
                          >
                            {date.getDate()}
                          </span>
                        ) : (
                          // Faded or empty space to perfectly align with the design
                          <span className="w-6 h-6 text-slate-300 font-extrabold text-xs flex items-center justify-center">
                            {date.getDate()}
                          </span>
                        )}

                        {/* Event indicator orange dot, like in the attached image */}
                        {dayBookings.length > 0 && isCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>

                      {/* Flex spacer */}
                      <div className="flex-1" />
                    </div>
                  );
                })}
              </div>

              {/* Absolute overlay for booking bars */}
              <div className="absolute top-[34px] left-0 right-0 bottom-2 pointer-events-none z-10">
                {weekTracks.map(({ booking, startCol, endCol, track, startsInWeek, endsInWeek }) => {
                  const barColor = getBookingColor(booking);
                  
                  // Horizontal position math
                  const leftPercent = (startCol / 7) * 100;
                  const widthPercent = ((endCol - startCol + 1) / 7) * 105; // Slightly overlap cell border
                  
                  // Adjust padding and rounding so it looks incredibly clean
                  const paddingLeft = startsInWeek ? 6 : 0;
                  const paddingRight = endsInWeek ? 6 : 0;
                  const roundedClass = `${startsInWeek ? 'rounded-l-full' : ''} ${endsInWeek ? 'rounded-r-full' : ''}`;

                  const leftStyle = `calc(${leftPercent}% + ${paddingLeft}px)`;
                  // Subtract padding from both sides
                  const widthStyle = `calc(${((endCol - startCol + 1) / 7) * 100}% - ${paddingLeft + paddingRight}px)`;
                  const topStyle = `${track * 11}px`; // 6px bar + 5px gap

                  const infoTooltip = `Invoice: ${booking.invoice_no}\nClient: ${booking.client_name}\nRoute: ${booking.route}\nVehicle: ${booking.assigned_vehicle_reg}\nStatus: ${booking.status} (${booking.payment_status})`;

                  return (
                    <div
                      key={booking.invoice_no}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(booking);
                      }}
                      title={infoTooltip}
                      style={{
                        left: leftStyle,
                        width: widthStyle,
                        top: topStyle,
                        backgroundColor: barColor,
                      }}
                      className={`absolute h-1.5 pointer-events-auto transition-all cursor-pointer duration-150 hover:brightness-110 hover:scale-y-125 hover:shadow-xs active:scale-95 ${roundedClass}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
