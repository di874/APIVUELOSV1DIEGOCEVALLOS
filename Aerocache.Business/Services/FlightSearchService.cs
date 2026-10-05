using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class FlightSearchService : IFlightSearchService
    {
        private readonly IUnitOfWork _uow;

        public FlightSearchService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<SearchResponse> SearchFlightsAsync(SearchRequest request, string? deviceFingerprint)
        {
            if (request.Itineraries == null || !request.Itineraries.Any())
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Petición inválida", "Debe incluir al menos un itinerario.");
            }

            var firstItin = request.Itineraries.First();
            var origin = firstItin.Origin?.ToUpperInvariant() ?? "";
            var dest = firstItin.Destination?.ToUpperInvariant() ?? "";

            var validAirports = new HashSet<string> { "UIO", "GYE", "CUE" };
            if (!validAirports.Contains(origin) || !validAirports.Contains(dest))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Ruta no disponible",
                    $"Aerocache opera exclusivamente en Ecuador entre Quito (UIO), Guayaquil (GYE) y Cuenca (CUE). Origen o destino no válido.");
            }

            if (origin == dest)
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Ruta inválida", "El origen y destino no pueden ser iguales.");
            }

            DateTime searchDate;
            if (!DateTime.TryParse(firstItin.DepartureDate, out searchDate))
            {
                searchDate = DateTime.UtcNow.Date;
            }

            var query = _uow.Flights.Query()
                .Include(f => f.CabinFares)
                .Where(f => f.OriginIata == origin && f.DestinationIata == dest);

            var minDate = searchDate.Date;
            var maxDate = searchDate.Date.AddDays(1);
            var flights = await query.Where(f => f.ScheduledDeparture >= minDate && f.ScheduledDeparture < maxDate).ToListAsync();

            if (!flights.Any())
            {
                flights = await query.Take(4).ToListAsync();
            }

            int totalPassengers = (request.Passengers?.Adults ?? 1) + (request.Passengers?.Youths ?? 0) + (request.Passengers?.Children ?? 0);
            if (totalPassengers <= 0) totalPassengers = 1;

            var offers = new List<FlightOfferDto>();

            foreach (var flight in flights)
            {
                var offerId = $"OFF-{flight.Id}";
                var segmentId = $"SEG-{flight.Id}";

                var segment = new FlightSegmentDto
                {
                    SegmentId = segmentId,
                    FlightNumber = flight.FlightNumber,
                    MarketingCarrier = flight.MarketingCarrier,
                    OperatingCarrier = flight.OperatingCarrier,
                    Aircraft = flight.Aircraft,
                    DurationMinutes = flight.DurationMinutes,
                    Status = flight.Status,
                    Departure = new FlightEndpoint
                    {
                        IataCode = flight.OriginIata,
                        At = flight.ScheduledDeparture.ToString("o"),
                        Terminal = flight.TerminalDeparture
                    },
                    Arrival = new FlightEndpoint
                    {
                        IataCode = flight.DestinationIata,
                        At = flight.ScheduledArrival.ToString("o"),
                        Terminal = flight.TerminalArrival
                    }
                };

                var pricingOptions = new List<CabinPricingDto>();
                decimal lowestTotal = decimal.MaxValue;

                foreach (var fare in flight.CabinFares)
                {
                    decimal passengerTotal = fare.TotalPrice * totalPassengers;
                    if (passengerTotal < lowestTotal) lowestTotal = passengerTotal;

                    pricingOptions.Add(new CabinPricingDto
                    {
                        CabinClass = fare.CabinClass,
                        FareBrand = fare.FareBrand,
                        AvailableSeats = fare.AvailableSeats,
                        FareRules = new FareRulesDto
                        {
                            IsRefundable = fare.IsRefundable,
                            IsChangeable = fare.IsChangeable
                        },
                        BaggageAllowance = new BaggageAllowanceDto
                        {
                            PersonalItemIncluded = fare.PersonalItemIncluded,
                            CarryOnIncluded = fare.CarryOnIncluded,
                            CheckedBaggageIncluded = fare.CheckedBaggageIncluded
                        },
                        ExtraCheckedBaggagePrice = new MoneyAmount
                        {
                            Currency = fare.Currency,
                            Total = fare.ExtraBaggagePrice.ToString("F2", CultureInfo.InvariantCulture)
                        },
                        PricePerPassengerType = new List<PassengerPriceDto>
                        {
                            new() {
                                PassengerType = "ADULT",
                                Price = new MoneyAmount {
                                    Currency = fare.Currency,
                                    BaseFare = fare.BaseFare.ToString("F2", CultureInfo.InvariantCulture),
                                    Taxes = fare.Taxes.ToString("F2", CultureInfo.InvariantCulture),
                                    Total = fare.TotalPrice.ToString("F2", CultureInfo.InvariantCulture)
                                }
                            }
                        }
                    });
                }

                offers.Add(new FlightOfferDto
                {
                    OfferId = offerId,
                    Airline = new AirlineInfoDto { Code = "AC", Name = "AEROCACHE" },
                    Itineraries = new List<ItineraryOptionDto>
                    {
                        new()
                        {
                            ItineraryId = $"ITIN-{flight.Id}",
                            TotalDurationMinutes = flight.DurationMinutes,
                            StopsCount = 0,
                            Segments = new List<FlightSegmentDto> { segment },
                            PricingOptions = pricingOptions
                        }
                    },
                    GrandTotal = new MoneyAmount
                    {
                        Currency = "USD",
                        Total = (lowestTotal == decimal.MaxValue ? 49.00m : lowestTotal).ToString("F2", CultureInfo.InvariantCulture)
                    }
                });
            }

            return new SearchResponse
            {
                TotalOffers = offers.Count,
                Offers = offers
            };
        }

        public async Task<SeatMapResponse> GetSeatMapAsync(string offerId, string segmentId)
        {
            // Extract flightId from offerId ("OFF-{flightId}") or segmentId ("SEG-{flightId}")
            string flightId = "";
            if (!string.IsNullOrEmpty(offerId) && offerId.StartsWith("OFF-"))
                flightId = offerId.Substring(4).Trim();
            else if (!string.IsNullOrEmpty(segmentId) && segmentId.StartsWith("SEG-"))
                flightId = segmentId.Substring(4).Trim();
            else if (!string.IsNullOrEmpty(offerId))
                flightId = offerId.Trim();

            // Find all occupied seats for this flight from confirmed or checked-in bookings in the database
            var occupiedSeats = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (!string.IsNullOrEmpty(flightId))
            {
                var bookedSeats = await _uow.Bookings.Query()
                    .Where(b => b.FlightId == flightId && (b.Status == "CONFIRMED" || b.Status == "CHECKED_IN"))
                    .SelectMany(b => b.Passengers.Select(p => p.AssignedSeatNumber))
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToListAsync();

                foreach (var s in bookedSeats)
                {
                    if (!string.IsNullOrWhiteSpace(s))
                        occupiedSeats.Add(s.Trim().ToUpperInvariant());
                }
            }

            // Standard Airbus A320 seat layout: Rows 1 to 24, Seats A, B, C, D, E, F
            var cabins = new List<SeatMapCabinDto>();

            // Premium Economy: Rows 1 to 3
            var premiumRows = new List<SeatMapRowDto>();
            for (int r = 1; r <= 3; r++)
            {
                var seats = new List<SeatMapSeatDto>();
                foreach (var c in new[] { "A", "B", "C", "D", "E", "F" })
                {
                    var seatNum = $"{r}{c}";
                    var chars = new List<string> { "EXTRA_LEGROOM" };
                    if (c == "A" || c == "F") chars.Add("WINDOW");
                    if (c == "C" || c == "D") chars.Add("AISLE");

                    bool isTaken = occupiedSeats.Contains(seatNum);

                    seats.Add(new SeatMapSeatDto
                    {
                        SeatNumber = seatNum,
                        IsAvailable = !isTaken,
                        Characteristics = chars
                    });
                }
                premiumRows.Add(new SeatMapRowDto { RowNumber = r, Seats = seats });
            }
            cabins.Add(new SeatMapCabinDto { CabinClass = "PREMIUM_ECONOMY", Rows = premiumRows });

            // Economy: Rows 4 to 24
            var economyRows = new List<SeatMapRowDto>();
            for (int r = 4; r <= 24; r++)
            {
                var seats = new List<SeatMapSeatDto>();
                foreach (var c in new[] { "A", "B", "C", "D", "E", "F" })
                {
                    var seatNum = $"{r}{c}";
                    var chars = new List<string>();
                    if (c == "A" || c == "F") chars.Add("WINDOW");
                    if (c == "C" || c == "D") chars.Add("AISLE");
                    if (r == 11 || r == 12) chars.Add("EMERGENCY_EXIT");

                    bool isTaken = occupiedSeats.Contains(seatNum);

                    seats.Add(new SeatMapSeatDto
                    {
                        SeatNumber = seatNum,
                        IsAvailable = !isTaken,
                        Characteristics = chars
                    });
                }
                economyRows.Add(new SeatMapRowDto { RowNumber = r, Seats = seats });
            }
            cabins.Add(new SeatMapCabinDto { CabinClass = "ECONOMY", Rows = economyRows });

            return new SeatMapResponse
            {
                SegmentId = segmentId,
                Cabins = cabins
            };
        }
    }
}
