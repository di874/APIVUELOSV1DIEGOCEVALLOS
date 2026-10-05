using System;
using System.Collections.Generic;
using System.Linq;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;

namespace Aerocache.DataAccess.Seed
{
    public static class AerocacheDataSeeder
    {
        public static void SeedData(AerocacheDbContext context)
        {
            if (context.Flights.Any())
                return;

            var flights = new List<Flight>();
            var today = DateTime.UtcNow.Date;

            // Domestic routes for Ecuador: UIO, GYE, CUE
            var routes = new[]
            {
                // Quito <-> Guayaquil
                new { Origin = "UIO", Dest = "GYE", Number = "AC1401", DepHour = 6,  DepMin = 30, Duration = 50, Status = "SCHEDULED" },
                new { Origin = "UIO", Dest = "GYE", Number = "AC1403", DepHour = 10, DepMin = 0,  Duration = 50, Status = "BOARDING" },
                new { Origin = "UIO", Dest = "GYE", Number = "AC1405", DepHour = 15, DepMin = 15, Duration = 50, Status = "SCHEDULED" },
                new { Origin = "UIO", Dest = "GYE", Number = "AC1407", DepHour = 19, DepMin = 45, Duration = 50, Status = "SCHEDULED" },

                new { Origin = "GYE", Dest = "UIO", Number = "AC1402", DepHour = 7,  DepMin = 45, Duration = 50, Status = "DEPARTED" },
                new { Origin = "GYE", Dest = "UIO", Number = "AC1404", DepHour = 11, DepMin = 30, Duration = 50, Status = "SCHEDULED" },
                new { Origin = "GYE", Dest = "UIO", Number = "AC1406", DepHour = 16, DepMin = 45, Duration = 50, Status = "SCHEDULED" },
                new { Origin = "GYE", Dest = "UIO", Number = "AC1408", DepHour = 21, DepMin = 15, Duration = 50, Status = "SCHEDULED" },

                // Quito <-> Cuenca
                new { Origin = "UIO", Dest = "CUE", Number = "AC1501", DepHour = 7,  DepMin = 0,  Duration = 45, Status = "SCHEDULED" },
                new { Origin = "UIO", Dest = "CUE", Number = "AC1503", DepHour = 14, DepMin = 20, Duration = 45, Status = "SCHEDULED" },
                new { Origin = "UIO", Dest = "CUE", Number = "AC1505", DepHour = 18, DepMin = 30, Duration = 45, Status = "SCHEDULED" },

                new { Origin = "CUE", Dest = "UIO", Number = "AC1502", DepHour = 8,  DepMin = 15, Duration = 45, Status = "SCHEDULED" },
                new { Origin = "CUE", Dest = "UIO", Number = "AC1504", DepHour = 15, DepMin = 35, Duration = 45, Status = "DELAYED" },
                new { Origin = "CUE", Dest = "UIO", Number = "AC1506", DepHour = 19, DepMin = 45, Duration = 45, Status = "SCHEDULED" },

                // Guayaquil <-> Cuenca
                new { Origin = "GYE", Dest = "CUE", Number = "AC1601", DepHour = 8,  DepMin = 0,  Duration = 35, Status = "SCHEDULED" },
                new { Origin = "GYE", Dest = "CUE", Number = "AC1603", DepHour = 17, DepMin = 10, Duration = 35, Status = "SCHEDULED" },

                new { Origin = "CUE", Dest = "GYE", Number = "AC1602", DepHour = 9,  DepMin = 0,  Duration = 35, Status = "ARRIVED" },
                new { Origin = "CUE", Dest = "GYE", Number = "AC1604", DepHour = 18, DepMin = 10, Duration = 35, Status = "SCHEDULED" }
            };

            for (int dayOffset = -1; dayOffset <= 14; dayOffset++)
            {
                var flightDate = today.AddDays(dayOffset);

                foreach (var r in routes)
                {
                    var depTime = flightDate.AddHours(r.DepHour).AddMinutes(r.DepMin);
                    var arrTime = depTime.AddMinutes(r.Duration);
                    var flightId = $"{r.Number}-{flightDate:yyyyMMdd}";

                    var flight = new Flight
                    {
                        Id = flightId,
                        FlightNumber = r.Number,
                        MarketingCarrier = "AC",
                        OperatingCarrier = "AC",
                        AirlineName = "AEROCACHE",
                        Aircraft = "Airbus A320",
                        OriginIata = r.Origin,
                        DestinationIata = r.Dest,
                        ScheduledDeparture = depTime,
                        ScheduledArrival = arrTime,
                        DurationMinutes = r.Duration,
                        TerminalDeparture = "T1",
                        TerminalArrival = "T1",
                        Status = dayOffset == 0 ? r.Status : (dayOffset < 0 ? "ARRIVED" : "SCHEDULED")
                    };

                    decimal basePrice = (r.Origin == "GYE" && r.Dest == "CUE") || (r.Origin == "CUE" && r.Dest == "GYE") ? 39.00m : 49.00m;
                    decimal taxes = Math.Round(basePrice * 0.15m, 2);

                    flight.CabinFares.Add(new CabinFare
                    {
                        FlightId = flightId,
                        CabinClass = "ECONOMY",
                        FareBrand = "Light",
                        AvailableSeats = 28,
                        BaseFare = basePrice,
                        Taxes = taxes,
                        TotalPrice = basePrice + taxes,
                        Currency = "USD",
                        IsRefundable = false,
                        IsChangeable = true,
                        PersonalItemIncluded = true,
                        CarryOnIncluded = 0,
                        CheckedBaggageIncluded = 0,
                        ExtraBaggagePrice = 20.00m
                    });

                    decimal plusBase = basePrice + 25.00m;
                    decimal plusTaxes = Math.Round(plusBase * 0.15m, 2);
                    flight.CabinFares.Add(new CabinFare
                    {
                        FlightId = flightId,
                        CabinClass = "ECONOMY",
                        FareBrand = "Plus",
                        AvailableSeats = 22,
                        BaseFare = plusBase,
                        Taxes = plusTaxes,
                        TotalPrice = plusBase + plusTaxes,
                        Currency = "USD",
                        IsRefundable = false,
                        IsChangeable = true,
                        PersonalItemIncluded = true,
                        CarryOnIncluded = 1,
                        CheckedBaggageIncluded = 1,
                        ExtraBaggagePrice = 18.00m
                    });

                    decimal topBase = basePrice + 55.00m;
                    decimal topTaxes = Math.Round(topBase * 0.15m, 2);
                    flight.CabinFares.Add(new CabinFare
                    {
                        FlightId = flightId,
                        CabinClass = "PREMIUM_ECONOMY",
                        FareBrand = "Top",
                        AvailableSeats = 12,
                        BaseFare = topBase,
                        Taxes = topTaxes,
                        TotalPrice = topBase + topTaxes,
                        Currency = "USD",
                        IsRefundable = true,
                        IsChangeable = true,
                        PersonalItemIncluded = true,
                        CarryOnIncluded = 1,
                        CheckedBaggageIncluded = 2,
                        ExtraBaggagePrice = 15.00m
                    });

                    flights.Add(flight);
                }
            }

            context.Flights.AddRange(flights);
            context.SaveChanges();
        }
    }
}
