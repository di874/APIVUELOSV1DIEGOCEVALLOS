using System;

namespace Aerocache.Business.Helpers
{
    public static class FlightStatusCalculator
    {
        public static string ComputeStatus(DateTime scheduledDeparture, int durationMinutes, string? currentDbStatus = null, DateTime? targetDate = null, DateTime? referenceTimeUtc = null)
        {
            if (!string.IsNullOrEmpty(currentDbStatus))
            {
                var upper = currentDbStatus.Trim().ToUpperInvariant();
                if (upper == "CANCELLED" || upper == "DELAYED")
                {
                    return upper;
                }
            }

            var now = referenceTimeUtc ?? DateTime.UtcNow;

            DateTime depUtc;
            if (targetDate.HasValue)
            {
                depUtc = DateTime.SpecifyKind(targetDate.Value.Date + scheduledDeparture.TimeOfDay, DateTimeKind.Utc);
            }
            else
            {
                if (scheduledDeparture.Kind == DateTimeKind.Utc)
                {
                    depUtc = scheduledDeparture;
                }
                else if (scheduledDeparture.Kind == DateTimeKind.Local)
                {
                    depUtc = scheduledDeparture.ToUniversalTime();
                }
                else
                {
                    depUtc = DateTime.SpecifyKind(scheduledDeparture, DateTimeKind.Utc);
                }
            }

            int dur = durationMinutes > 0 ? durationMinutes : 50;
            var arrUtc = depUtc.AddMinutes(dur);

            if (now >= arrUtc)
            {
                return "ARRIVED";
            }

            if (now >= depUtc && now < arrUtc)
            {
                return "IN_FLIGHT";
            }

            var diffMinutesToDeparture = (depUtc - now).TotalMinutes;

            if (diffMinutesToDeparture <= 45)
            {
                return "BOARDING";
            }

            if (diffMinutesToDeparture <= 120)
            {
                return "CHECK_IN_OPEN";
            }

            return "SCHEDULED";
        }
    }
}
