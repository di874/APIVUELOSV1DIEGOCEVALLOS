using System;
using System.Globalization;

namespace Aerocache.Business.Helpers
{
    public static class EcuadorTimeHelper
    {
        public static readonly TimeSpan EcuadorOffset = TimeSpan.FromHours(-5);

        /// <summary>
        /// Formats a flight schedule DateTime as an ISO-8601 string with Ecuador offset -05:00.
        /// Preserves the flight's wall-clock hour, minute, and second.
        /// Example: 2026-11-20 06:30:00 -> "2026-11-20T06:30:00-05:00"
        /// </summary>
        public static string FormatFlightScheduleIso(DateTime dt)
        {
            var dto = new DateTimeOffset(dt.Year, dt.Month, dt.Day, dt.Hour, dt.Minute, dt.Second, EcuadorOffset);
            return dto.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture);
        }

        public static string? FormatFlightScheduleIso(DateTime? dt)
        {
            if (!dt.HasValue) return null;
            return FormatFlightScheduleIso(dt.Value);
        }

        /// <summary>
        /// Formats an instant in time (typically UTC, such as DateTime.UtcNow or entity timestamp)
        /// into an ISO-8601 string with Ecuador offset -05:00.
        /// Converts the UTC time to Ecuador local time (UTC-5).
        /// Example: 2026-11-15 16:30:00Z -> "2026-11-15T11:30:00-05:00"
        /// </summary>
        public static string FormatInstantIso(DateTime dt)
        {
            DateTimeOffset dto;
            if (dt.Kind == DateTimeKind.Utc)
            {
                dto = new DateTimeOffset(dt).ToOffset(EcuadorOffset);
            }
            else
            {
                // If unspecified or local, assume UTC if near UtcNow, or convert as Utc
                dto = new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc)).ToOffset(EcuadorOffset);
            }
            return dto.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture);
        }

        public static string? FormatInstantIso(DateTime? dt)
        {
            if (!dt.HasValue) return null;
            return FormatInstantIso(dt.Value);
        }
    }
}
