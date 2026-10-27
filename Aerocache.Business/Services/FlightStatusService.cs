using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Helpers;
using Aerocache.Business.Interfaces;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class FlightStatusService : IFlightStatusService
    {
        private readonly IUnitOfWork _uow;
        private readonly IEventBus _eventBus;

        public FlightStatusService(IUnitOfWork uow, IEventBus eventBus)
        {
            _uow = uow;
            _eventBus = eventBus;
        }

        public async Task<FlightStatusDto> GetFlightStatusAsync(string flightNumber, string date)
        {
            var flight = await _uow.Vuelos.Query()
                .FirstOrDefaultAsync(f => f.NumeroVuelo == flightNumber);

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "FLIGHT_STATUS_NOT_AVAILABLE", $"Estado de vuelo no disponible para {flightNumber}");
            }

            DateTime queryDate;
            if (!DateTime.TryParse(date, out queryDate))
                queryDate = DateTime.UtcNow.Date;

            var dynamicStatus = FlightStatusCalculator.ComputeStatus(flight.SalidaProgramada, flight.DuracionMinutos, flight.Estado, queryDate);

            return new FlightStatusDto
            {
                FlightNumber = flight.NumeroVuelo,
                Date = queryDate.ToString("yyyy-MM-dd"),
                MarketingCarrier = flight.AerolineaComercial,
                OperatingCarrier = flight.AerolineaOperadora,
                Aircraft = flight.Aeronave,
                Status = dynamicStatus,
                Departure = new FlightStatusEndpoint
                {
                    IataCode = flight.OrigenIata,
                    Terminal = flight.TerminalSalida,
                    ScheduledAt = flight.SalidaProgramada.ToString("o"),
                    EstimatedAt = flight.SalidaEstimada?.ToString("o"),
                    ActualAt = flight.SalidaReal?.ToString("o")
                },
                Arrival = new FlightStatusEndpoint
                {
                    IataCode = flight.DestinoIata,
                    Terminal = flight.TerminalLlegada,
                    ScheduledAt = flight.LlegadaProgramada.ToString("o"),
                    EstimatedAt = flight.LlegadaEstimada?.ToString("o"),
                    ActualAt = flight.LlegadaReal?.ToString("o")
                }
            };
        }

        public async Task<FlightStatusUpdateResponse> UpdateFlightStatusAsync(string flightNumber, FlightStatusUpdateRequest request, string? idempotencyKey)
        {
            var flight = await _uow.Vuelos.Query()
                .FirstOrDefaultAsync(f => f.NumeroVuelo == flightNumber);

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "FLIGHT_NOT_FOUND", $"Vuelo {flightNumber} no encontrado");
            }

            var prev = flight.Estado;
            flight.Estado = request.Status;

            if (!string.IsNullOrEmpty(request.EstimatedDepartureAt) && DateTime.TryParse(request.EstimatedDepartureAt, out var estDep))
            {
                flight.SalidaEstimada = estDep;
            }
            if (!string.IsNullOrEmpty(request.EstimatedArrivalAt) && DateTime.TryParse(request.EstimatedArrivalAt, out var estArr))
            {
                flight.LlegadaEstimada = estArr;
            }

            await _uow.CompleteAsync();

            var affected = await _uow.Reservas.Query().CountAsync(r => r.VueloId == flight.Id);
            var eventId = "evt-vue-" + Guid.NewGuid().ToString("N")[..8];

            await _eventBus.PublishAsync("ec.edu.epn.booking.vuelos.flight.status_changed", new
            {
                flightNumber = flight.NumeroVuelo,
                date = request.Date,
                previousStatus = prev,
                newStatus = flight.Estado,
                departureGate = request.DepartureGate,
                reason = request.Reason,
                affectedBookings = affected,
                timestamp = DateTime.UtcNow
            });

            return new FlightStatusUpdateResponse
            {
                PreviousStatus = prev,
                Flight = await GetFlightStatusAsync(flightNumber, request.Date),
                AffectedBookings = affected,
                EventId = eventId
            };
        }

        public async Task<FlightOperationsResponse> GetFlightOperationsAsync(string? date, string? origin, string? destination, string? status, int limit, string? cursor)
        {
            var query = _uow.Vuelos.Query()
                .Include(f => f.TarifasCabina)
                .AsQueryable();

            if (!string.IsNullOrEmpty(origin))
                query = query.Where(f => f.OrigenIata == origin);

            if (!string.IsNullOrEmpty(destination))
                query = query.Where(f => f.DestinoIata == destination);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(f => f.Estado == status);

            DateTime filterDate = DateTime.UtcNow.Date;
            if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
            {
                filterDate = parsedDate.Date;
                var nextDate = filterDate.AddDays(1);
                query = query.Where(f => f.SalidaProgramada >= filterDate && f.SalidaProgramada < nextDate);
            }

            var flights = await query.Take(limit > 0 ? limit : 20).ToListAsync();

            var items = new List<FlightInventoryItem>();
            foreach (var f in flights)
            {
                var reservations = await _uow.Reservas.Query()
                    .Include(r => r.Pasajeros)
                    .Where(r => r.VueloId == f.Id && r.Estado != "CANCELLED")
                    .ToListAsync();

                var bookedCount = reservations.SelectMany(r => r.Pasajeros).Count();
                var activeHolds = await _uow.BloqueosTemporales.Query()
                    .Where(b => b.VueloId == f.Id && b.Estado == "HELD" && b.FechaExpiracion > DateTime.UtcNow)
                    .ToListAsync();

                int totalSeats = 180;
                int economySeats = 150;

                int heldSeats = activeHolds.Sum(h => h.Adultos + h.Jovenes + h.Ninos);
                int checkedInSeats = reservations.SelectMany(r => r.Pasajeros).Count(p => p.TieneCheckIn);
                int availableSeats = Math.Max(0, totalSeats - bookedCount - heldSeats);

                double loadFactor = totalSeats > 0 ? Math.Round(((double)(bookedCount + heldSeats) / totalSeats) * 100, 1) : 0.0;

                var alerts = new List<FlightAlertItem>();
                if (availableSeats < 10)
                {
                    alerts.Add(new FlightAlertItem
                    {
                        Code = "LOW_AVAILABILITY",
                        Severity = "WARNING",
                        Message = $"Quedan menos de 10 asientos disponibles en el vuelo {f.NumeroVuelo}."
                    });
                }
                if (f.Estado == "DELAYED")
                {
                    alerts.Add(new FlightAlertItem
                    {
                        Code = "DELAYED",
                        Severity = "CRITICAL",
                        Message = $"El vuelo {f.NumeroVuelo} reporta demora operativa."
                    });
                }

                var dynamicStatus = FlightStatusCalculator.ComputeStatus(f.SalidaProgramada, f.DuracionMinutos, f.Estado, filterDate);

                items.Add(new FlightInventoryItem
                {
                    FlightNumber = f.NumeroVuelo,
                    Date = f.SalidaProgramada.ToString("yyyy-MM-dd"),
                    Origin = f.OrigenIata,
                    Destination = f.DestinoIata,
                    DepartureAt = f.SalidaProgramada.ToString("o"),
                    Status = dynamicStatus,
                    Aircraft = f.Aeronave,
                    TotalSeats = totalSeats,
                    LoadFactor = loadFactor,
                    ActiveHolds = activeHolds.Count,
                    NextHoldExpiryAt = activeHolds.OrderBy(h => h.FechaExpiracion).FirstOrDefault()?.FechaExpiracion.ToString("o"),
                    CheckInOpen = (f.SalidaProgramada - DateTime.UtcNow).TotalHours <= 24 && f.Estado != "CANCELLED",
                    Cabins = new List<CabinInventoryItem>
                    {
                        new CabinInventoryItem
                        {
                            CabinClass = "ECONOMY",
                            TotalSeats = economySeats,
                            SeatsByStatus = new Dictionary<string, int>
                            {
                                ["AVAILABLE"] = Math.Max(0, economySeats - bookedCount - heldSeats),
                                ["HELD"] = heldSeats,
                                ["BOOKED"] = bookedCount,
                                ["TICKETED"] = bookedCount,
                                ["CHECKED_IN"] = checkedInSeats,
                                ["BOARDED"] = 0
                            }
                        }
                    },
                    Alerts = alerts
                });
            }

            return new FlightOperationsResponse
            {
                Date = filterDate.ToString("yyyy-MM-dd"),
                TotalFlights = items.Count,
                NextCursor = null,
                Items = items
            };
        }
    }
}
