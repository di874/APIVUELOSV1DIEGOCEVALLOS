using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Helpers;
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

        private record FlightTemplate(string FlightNumber, TimeSpan DepartureTime, int DurationMinutes);

        private List<FlightTemplate> GetRouteTemplates(string origin, string dest)
        {
            if (origin == "UIO" && dest == "GYE")
            {
                return new()
                {
                    new("AC1401", new TimeSpan(6, 30, 0), 50),
                    new("AC1403", new TimeSpan(10, 0, 0), 50),
                    new("AC1405", new TimeSpan(15, 15, 0), 50),
                    new("AC1407", new TimeSpan(19, 45, 0), 50)
                };
            }
            if (origin == "GYE" && dest == "UIO")
            {
                return new()
                {
                    new("AC1402", new TimeSpan(7, 45, 0), 50),
                    new("AC1404", new TimeSpan(11, 30, 0), 50),
                    new("AC1406", new TimeSpan(16, 45, 0), 50),
                    new("AC1408", new TimeSpan(21, 15, 0), 50)
                };
            }
            if (origin == "UIO" && dest == "CUE")
            {
                return new()
                {
                    new("AC1501", new TimeSpan(7, 0, 0), 55),
                    new("AC1503", new TimeSpan(14, 20, 0), 55),
                    new("AC1505", new TimeSpan(18, 30, 0), 55)
                };
            }
            if (origin == "CUE" && dest == "UIO")
            {
                return new()
                {
                    new("AC1502", new TimeSpan(8, 15, 0), 55),
                    new("AC1504", new TimeSpan(15, 35, 0), 55),
                    new("AC1506", new TimeSpan(19, 45, 0), 55)
                };
            }
            if (origin == "GYE" && dest == "CUE")
            {
                return new()
                {
                    new("AC1601", new TimeSpan(8, 0, 0), 45),
                    new("AC1603", new TimeSpan(17, 10, 0), 45)
                };
            }
            if (origin == "CUE" && dest == "GYE")
            {
                return new()
                {
                    new("AC1602", new TimeSpan(9, 0, 0), 45),
                    new("AC1604", new TimeSpan(18, 10, 0), 45)
                };
            }
            if (origin == "UIO" && dest == "GPS")
            {
                return new() { new("AC1701", new TimeSpan(9, 0, 0), 135) };
            }
            if (origin == "GPS" && dest == "UIO")
            {
                return new() { new("AC1702", new TimeSpan(12, 0, 0), 135) };
            }

            // Default template for any other route
            return new()
            {
                new("AC1801", new TimeSpan(8, 0, 0), 60),
                new("AC1803", new TimeSpan(14, 0, 0), 60),
                new("AC1805", new TimeSpan(19, 30, 0), 60)
            };
        }

        private async Task<List<Vuelo>> GetOrGenerateFlightsForLegAsync(string origin, string dest, DateTime searchDate)
        {
            origin = origin.Trim().ToUpperInvariant();
            dest = dest.Trim().ToUpperInvariant();
            var minDate = searchDate.Date;
            var maxDate = searchDate.Date.AddDays(1);

            var flights = await _uow.Vuelos.Query()
                .Include(f => f.TarifasCabina)
                .Where(f => f.OrigenIata == origin && f.DestinoIata == dest && f.SalidaProgramada >= minDate && f.SalidaProgramada < maxDate)
                .ToListAsync();

            if (flights.Any())
            {
                return flights;
            }

            var templates = GetRouteTemplates(origin, dest);
            var dateStr = searchDate.ToString("yyyyMMdd");
            var generatedFlights = new List<Vuelo>();

            foreach (var tmpl in templates)
            {
                var flightId = $"{tmpl.FlightNumber}-{dateStr}";
                var departureUtc = DateTime.SpecifyKind(searchDate.Date.Add(tmpl.DepartureTime), DateTimeKind.Utc);
                var arrivalUtc = departureUtc.AddMinutes(tmpl.DurationMinutes);

                var vuelo = new Vuelo
                {
                    Id = flightId,
                    NumeroVuelo = tmpl.FlightNumber,
                    AerolineaComercial = "AC",
                    AerolineaOperadora = "AC",
                    NombreAerolinea = "AEROCACHE",
                    Aeronave = "Airbus A320",
                    OrigenIata = origin,
                    DestinoIata = dest,
                    SalidaProgramada = departureUtc,
                    LlegadaProgramada = arrivalUtc,
                    DuracionMinutos = tmpl.DurationMinutes,
                    TerminalSalida = "T1",
                    TerminalLlegada = "T1",
                    Estado = "ON_TIME",
                    TarifasCabina = new List<TarifaCabina>
                    {
                        new()
                        {
                            Id = Guid.NewGuid().ToString(),
                            VueloId = flightId,
                            ClaseCabina = "ECONOMY",
                            MarcaTarifa = "Light",
                            AsientosDisponibles = 28,
                            TarifaBase = 49.00m,
                            Impuestos = 7.35m,
                            PrecioTotal = 56.35m,
                            Moneda = "USD",
                            EsReembolsable = false,
                            PermiteCambios = true,
                            ArticuloPersonalIncluido = true,
                            EquipajeManoIncluido = 0,
                            EquipajeBodegaIncluido = 0,
                            PrecioEquipajeAdicional = 20.00m
                        },
                        new()
                        {
                            Id = Guid.NewGuid().ToString(),
                            VueloId = flightId,
                            ClaseCabina = "ECONOMY",
                            MarcaTarifa = "Plus",
                            AsientosDisponibles = 22,
                            TarifaBase = 74.00m,
                            Impuestos = 11.10m,
                            PrecioTotal = 85.10m,
                            Moneda = "USD",
                            EsReembolsable = false,
                            PermiteCambios = true,
                            ArticuloPersonalIncluido = true,
                            EquipajeManoIncluido = 1,
                            EquipajeBodegaIncluido = 1,
                            PrecioEquipajeAdicional = 18.00m
                        },
                        new()
                        {
                            Id = Guid.NewGuid().ToString(),
                            VueloId = flightId,
                            ClaseCabina = "PREMIUM_ECONOMY",
                            MarcaTarifa = "Top",
                            AsientosDisponibles = 12,
                            TarifaBase = 104.00m,
                            Impuestos = 15.60m,
                            PrecioTotal = 119.60m,
                            Moneda = "USD",
                            EsReembolsable = true,
                            PermiteCambios = true,
                            ArticuloPersonalIncluido = true,
                            EquipajeManoIncluido = 1,
                            EquipajeBodegaIncluido = 1,
                            PrecioEquipajeAdicional = 15.00m
                        }
                    }
                };

                generatedFlights.Add(vuelo);
            }

            foreach (var gf in generatedFlights)
            {
                var exists = await _uow.Vuelos.Query().AnyAsync(f => f.Id == gf.Id);
                if (!exists)
                {
                    await _uow.Vuelos.AddAsync(gf);
                }
            }

            try
            {
                await _uow.CompleteAsync();
            }
            catch
            {
                // Ignorar colisión si otra petición concurrente insertó el registro
            }

            return generatedFlights;
        }

        private (ItineraryOptionDto Itinerary, decimal LowestTotal) BuildItineraryOption(Vuelo flight, int totalPassengers, DateTime searchDate, string itineraryId = "")
        {
            var segmentId = $"SEG-{flight.Id}";
            var dynamicStatus = FlightStatusCalculator.ComputeStatus(flight.SalidaProgramada, flight.DuracionMinutos, flight.Estado, searchDate);

            var segment = new FlightSegmentDto
            {
                SegmentId = segmentId,
                FlightNumber = flight.NumeroVuelo,
                MarketingCarrier = flight.AerolineaComercial,
                OperatingCarrier = flight.AerolineaOperadora,
                Aircraft = flight.Aeronave,
                DurationMinutes = flight.DuracionMinutos,
                Status = dynamicStatus,
                Departure = new FlightEndpoint
                {
                    IataCode = flight.OrigenIata,
                    At = flight.SalidaProgramada.ToString("o"),
                    Terminal = flight.TerminalSalida
                },
                Arrival = new FlightEndpoint
                {
                    IataCode = flight.DestinoIata,
                    At = flight.LlegadaProgramada.ToString("o"),
                    Terminal = flight.TerminalLlegada
                }
            };

            var pricingOptions = new List<CabinPricingDto>();
            decimal lowestTotal = decimal.MaxValue;

            var effectiveFares = (flight.TarifasCabina != null && flight.TarifasCabina.Any())
                ? flight.TarifasCabina.ToList()
                : new List<TarifaCabina>
                {
                    new() { ClaseCabina = "ECONOMY", MarcaTarifa = "BASIC", AsientosDisponibles = 60, TarifaBase = 49.00m, Impuestos = 7.35m, PrecioTotal = 56.35m, Moneda = "USD", ArticuloPersonalIncluido = true },
                    new() { ClaseCabina = "ECONOMY", MarcaTarifa = "PLUS", AsientosDisponibles = 50, TarifaBase = 66.00m, Impuestos = 9.90m, PrecioTotal = 75.90m, Moneda = "USD", ArticuloPersonalIncluido = true, EquipajeManoIncluido = 1, PermiteCambios = true },
                    new() { ClaseCabina = "PREMIUM_ECONOMY", MarcaTarifa = "TOP", AsientosDisponibles = 30, TarifaBase = 91.00m, Impuestos = 13.65m, PrecioTotal = 104.65m, Moneda = "USD", ArticuloPersonalIncluido = true, EquipajeManoIncluido = 1, EquipajeBodegaIncluido = 1, EsReembolsable = true, PermiteCambios = true }
                };

            foreach (var fare in effectiveFares)
            {
                decimal passengerTotal = fare.PrecioTotal * totalPassengers;
                if (passengerTotal < lowestTotal) lowestTotal = passengerTotal;

                pricingOptions.Add(new CabinPricingDto
                {
                    CabinClass = fare.ClaseCabina,
                    FareBrand = fare.MarcaTarifa,
                    AvailableSeats = fare.AsientosDisponibles,
                    FareRules = new FareRulesDto
                    {
                        IsRefundable = fare.EsReembolsable,
                        IsChangeable = fare.PermiteCambios
                    },
                    BaggageAllowance = new BaggageAllowanceDto
                    {
                        PersonalItemIncluded = fare.ArticuloPersonalIncluido,
                        CarryOnIncluded = fare.EquipajeManoIncluido,
                        CheckedBaggageIncluded = fare.EquipajeBodegaIncluido
                    },
                    ExtraCheckedBaggagePrice = new MoneyAmount
                    {
                        Currency = fare.Moneda,
                        Total = fare.PrecioEquipajeAdicional.ToString("F2", CultureInfo.InvariantCulture)
                    },
                    PricePerPassengerType = new List<PassengerPriceDto>
                    {
                        new() {
                            PassengerType = "ADULT",
                            Price = new MoneyAmount {
                                Currency = fare.Moneda,
                                BaseFare = fare.TarifaBase.ToString("F2", CultureInfo.InvariantCulture),
                                Taxes = fare.Impuestos.ToString("F2", CultureInfo.InvariantCulture),
                                Total = fare.PrecioTotal.ToString("F2", CultureInfo.InvariantCulture)
                            }
                        }
                    }
                });
            }

            if (lowestTotal == decimal.MaxValue) lowestTotal = 49.00m * totalPassengers;

            var itinOpt = new ItineraryOptionDto
            {
                ItineraryId = string.IsNullOrEmpty(itineraryId) ? $"ITIN-{flight.Id}" : itineraryId,
                TotalDurationMinutes = flight.DuracionMinutos,
                StopsCount = 0,
                Segments = new List<FlightSegmentDto> { segment },
                PricingOptions = pricingOptions
            };

            return (itinOpt, lowestTotal);
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

            if (string.IsNullOrWhiteSpace(origin) || string.IsNullOrWhiteSpace(dest))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Ruta no disponible", "Origen o destino no válido.");
            }

            if (origin == dest)
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "Ruta inválida", "El origen y destino no pueden ser iguales.");
            }

            int totalPassengers = (request.Passengers?.Adults ?? 1) + (request.Passengers?.Youths ?? 0) + (request.Passengers?.Children ?? 0);
            if (totalPassengers <= 0) totalPassengers = 1;

            var offers = new List<FlightOfferDto>();

            if (request.Itineraries.Count >= 2)
            {
                // BÚSQUEDA DE IDA Y VUELTA (ROUND-TRIP)
                var outItin = request.Itineraries[0];
                var retItin = request.Itineraries[1];

                if (!DateTime.TryParse(outItin.DepartureDate, out var outDate)) outDate = DateTime.UtcNow.Date;
                if (!DateTime.TryParse(retItin.DepartureDate, out var retDate)) retDate = outDate.AddDays(3);

                var outFlights = await GetOrGenerateFlightsForLegAsync(outItin.Origin ?? "UIO", outItin.Destination ?? "GYE", outDate);
                var retFlights = await GetOrGenerateFlightsForLegAsync(retItin.Origin ?? "GYE", retItin.Destination ?? "UIO", retDate);

                for (int i = 0; i < outFlights.Count; i++)
                {
                    var outF = outFlights[i];
                    var retF = retFlights[i % retFlights.Count];

                    var (outItinOpt, outLowest) = BuildItineraryOption(outF, totalPassengers, outDate, "ITI-1");
                    var (retItinOpt, retLowest) = BuildItineraryOption(retF, totalPassengers, retDate, "ITI-2");

                    var grandTotal = outLowest + retLowest;

                    offers.Add(new FlightOfferDto
                    {
                        OfferId = $"OFF-{outF.Id}_{retF.Id}",
                        Airline = new AirlineInfoDto { Code = "AC", Name = "AEROCACHE" },
                        Itineraries = new List<ItineraryOptionDto> { outItinOpt, retItinOpt },
                        GrandTotal = new MoneyAmount
                        {
                            Currency = "USD",
                            Total = grandTotal.ToString("F2", CultureInfo.InvariantCulture)
                        }
                    });
                }
            }
            else
            {
                // BÚSQUEDA DE SOLO IDA (ONE-WAY)
                var itin = request.Itineraries[0];
                if (!DateTime.TryParse(itin.DepartureDate, out var searchDate)) searchDate = DateTime.UtcNow.Date;

                var flights = await GetOrGenerateFlightsForLegAsync(origin, dest, searchDate);

                foreach (var flight in flights)
                {
                    var (itinOpt, lowestTotal) = BuildItineraryOption(flight, totalPassengers, searchDate, $"ITIN-{flight.Id}");

                    offers.Add(new FlightOfferDto
                    {
                        OfferId = $"OFF-{flight.Id}",
                        Airline = new AirlineInfoDto { Code = "AC", Name = "AEROCACHE" },
                        Itineraries = new List<ItineraryOptionDto> { itinOpt },
                        GrandTotal = new MoneyAmount
                        {
                            Currency = "USD",
                            Total = lowestTotal.ToString("F2", CultureInfo.InvariantCulture)
                        }
                    });
                }
            }

            return new SearchResponse
            {
                TotalOffers = offers.Count,
                Offers = offers
            };
        }

        public async Task<SeatMapResponse> GetSeatMapAsync(string offerId, string segmentId)
        {
            // Extract flightId from segmentId ("SEG-{flightId}") or offerId ("OFF-{flightId}")
            string flightId = "";
            if (!string.IsNullOrEmpty(segmentId) && segmentId.StartsWith("SEG-"))
                flightId = segmentId.Substring(4).Trim();
            else if (!string.IsNullOrEmpty(offerId) && offerId.StartsWith("OFF-"))
            {
                var clean = offerId.Substring(4).Trim();
                // Si es ida y vuelta (e.g. AC1401-20261120_AC1402-20261125), tomar el primer segmento por defecto si no vino segmentId
                var parts = clean.Split('_', StringSplitOptions.RemoveEmptyEntries);
                flightId = parts[0];
            }
            else if (!string.IsNullOrEmpty(offerId))
            {
                var clean = offerId.Trim();
                var parts = clean.Split('_', StringSplitOptions.RemoveEmptyEntries);
                flightId = parts[0];
            }

            // Find all occupied seats for this flight from confirmed or checked-in bookings in the database
            var bookedSeatMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var heldSeats = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (!string.IsNullOrEmpty(flightId))
            {
                var bookings = await _uow.Reservas.Query()
                    .Where(b => b.VueloId != null && (b.VueloId == flightId || b.VueloId.Contains(flightId)) && b.Estado != "CANCELLED")
                    .Include(b => b.Pasajeros)
                    .ToListAsync();

                foreach (var b in bookings)
                {
                    string defaultStatus = b.Estado == "CHECKED_IN" ? "CHECKED_IN" : (b.Estado == "TICKETED" ? "TICKETED" : "BOOKED");
                    foreach (var p in b.Pasajeros)
                    {
                        if (!string.IsNullOrWhiteSpace(p.NumeroAsientoAsignado))
                        {
                            var s = p.NumeroAsientoAsignado.Trim().ToUpperInvariant();
                            string pStatus = (p.TieneCheckIn || b.Estado == "CHECKED_IN") ? "CHECKED_IN" : defaultStatus;
                            bookedSeatMap[s] = pStatus;
                        }
                    }
                }

                // Holds activos vigentes
                var nowUtc = DateTime.UtcNow;
                var activeHolds = await _uow.BloqueosTemporales.Query()
                    .Where(h => (h.VueloId == flightId || h.OfertaId == offerId || h.VueloId.Contains(flightId) || h.OfertaId.Contains(flightId))
                                && h.Estado == "HELD" 
                                && h.FechaExpiracion > nowUtc)
                    .ToListAsync();

                foreach (var h in activeHolds)
                {
                    if (!string.IsNullOrWhiteSpace(h.AsientosAsignados))
                    {
                        foreach (var s in h.AsientosAsignados.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        {
                            heldSeats.Add(s.ToUpperInvariant());
                        }
                    }
                }
            }

            // Helper function to resolve seat availability & status
            (bool isAvailable, string status) ResolveSeat(string seatNum)
            {
                if (bookedSeatMap.TryGetValue(seatNum, out var bStatus))
                {
                    return (false, bStatus);
                }
                if (heldSeats.Contains(seatNum))
                {
                    return (false, "HELD");
                }
                return (true, "AVAILABLE");
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

                    var (isAvail, status) = ResolveSeat(seatNum);

                    seats.Add(new SeatMapSeatDto
                    {
                        SeatNumber = seatNum,
                        IsAvailable = isAvail,
                        Status = status,
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

                    var (isAvail, status) = ResolveSeat(seatNum);

                    seats.Add(new SeatMapSeatDto
                    {
                        SeatNumber = seatNum,
                        IsAvailable = isAvail,
                        Status = status,
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
