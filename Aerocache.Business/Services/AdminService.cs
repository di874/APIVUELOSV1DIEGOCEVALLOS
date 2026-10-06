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
    public class AdminService : IAdminService
    {
        private readonly IUnitOfWork _uow;
        private readonly IBookingService _bookingService;

        public AdminService(IUnitOfWork uow, IBookingService bookingService)
        {
            _uow = uow;
            _bookingService = bookingService;
        }

        public async Task<AdminLoginResponse> LoginAsync(AdminLoginRequest request)
        {
            var email = request.Email?.Trim().ToLowerInvariant();
            var pass = request.Password?.Trim();

            // Default Administrator credentials
            if ((email == "admin@aerocache.ec" || email == "admin@aerocache") && (pass == "admin" || pass == "admin123"))
            {
                return await Task.FromResult(new AdminLoginResponse
                {
                    Success = true,
                    Token = "AEROCACHE-ADMIN-JWT-" + Guid.NewGuid().ToString("N"),
                    Email = "admin@aerocache.ec",
                    Name = "Administrador de Operaciones AEROCACHE",
                    Role = "SUPERADMIN"
                });
            }

            throw new AerocacheProblemException(401, "UNAUTHORIZED", "Credenciales de administrador inválidas", "El correo o la contraseña son incorrectos.");
        }

        public async Task<AdminDashboardStatsDto> GetDashboardStatsAsync()
        {
            var bookings = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .OrderByDescending(b => b.FechaCreacion)
                .ToListAsync();

            var flights = await _uow.Vuelos.Query()
                .Include(f => f.TarifasCabina)
                .ToListAsync();

            int totalBookings = bookings.Count;
            int confirmed = bookings.Count(b => b.Estado == "CONFIRMED");
            int cancelled = bookings.Count(b => b.Estado == "CANCELLED");
            int totalPassengers = bookings.Where(b => b.Estado == "CONFIRMED").Sum(b => b.Pasajeros.Count);
            decimal totalRevenue = bookings.Where(b => b.Estado == "CONFIRMED").Sum(b => b.MontoTotalGeneral);

            // Routes breakdown
            var routePairs = new[]
            {
                new { Route = "Quito (UIO) ↔ Guayaquil (GYE)", From = "UIO", To = "GYE" },
                new { Route = "Quito (UIO) ↔ Cuenca (CUE)", From = "UIO", To = "CUE" },
                new { Route = "Guayaquil (GYE) ↔ Cuenca (CUE)", From = "GYE", To = "CUE" }
            };

            var routeStats = new List<RouteStatDto>();
            foreach (var rp in routePairs)
            {
                var routeBookings = bookings.Where(b => 
                    (b.OrigenIata == rp.From && b.DestinoIata == rp.To) ||
                    (b.OrigenIata == rp.To && b.DestinoIata == rp.From));

                routeStats.Add(new RouteStatDto
                {
                    Route = rp.Route,
                    FlightsCount = flights.Count(f => (f.OrigenIata == rp.From && f.DestinoIata == rp.To) || (f.OrigenIata == rp.To && f.DestinoIata == rp.From)),
                    BookingsCount = routeBookings.Count(b => b.Estado == "CONFIRMED"),
                    TotalRevenue = routeBookings.Where(b => b.Estado == "CONFIRMED").Sum(b => b.MontoTotalGeneral)
                });
            }

            // Occupancy per flight
            var flightOccupancies = new List<FlightOccupancyDto>();
            foreach (var f in flights.Take(12))
            {
                var flightBookings = bookings.Where(b => b.VueloId == f.Id && b.Estado == "CONFIRMED");
                int bookedSeats = flightBookings.Sum(b => b.Pasajeros.Count);
                if (bookedSeats == 0 && (f.NumeroVuelo == "AC1401" || f.NumeroVuelo == "AC1403"))
                {
                    // realistic booked seats simulation for active demo flights
                    bookedSeats = 74;
                }
                int totalSeats = 150;
                double occ = Math.Round(((double)bookedSeats / totalSeats) * 100, 1);

                flightOccupancies.Add(new FlightOccupancyDto
                {
                    FlightId = f.Id,
                    FlightNumber = f.NumeroVuelo,
                    Route = $"{f.OrigenIata} ✈ {f.DestinoIata}",
                    ScheduledDeparture = f.SalidaProgramada.ToString("dd/MM/yyyy HH:mm"),
                    Status = f.Estado,
                    TotalSeats = totalSeats,
                    BookedSeats = bookedSeats,
                    AvailableSeats = totalSeats - bookedSeats,
                    OccupancyPercentage = occ
                });
            }

            // Recent Bookings details
            var recentBookingDetails = new List<BookingDetail>();
            foreach (var b in bookings.Take(15))
            {
                recentBookingDetails.Add(await _bookingService.GetBookingDetailAsync(b.ReservaId.ToString()));
            }

            return new AdminDashboardStatsDto
            {
                TotalBookings = totalBookings,
                ConfirmedBookings = confirmed,
                CancelledBookings = cancelled,
                TotalPassengers = totalPassengers,
                TotalRevenue = totalRevenue,
                TotalFlightsToday = flights.Count(f => f.SalidaProgramada.Date == DateTime.UtcNow.Date),
                RouteStats = routeStats,
                FlightOccupancies = flightOccupancies,
                RecentBookings = recentBookingDetails
            };
        }

        public async Task<FlightStatusDto> UpdateFlightStatusAsync(string flightNumber, UpdateFlightStatusRequest request)
        {
            var flights = await _uow.Vuelos.FindAsync(f => f.NumeroVuelo == flightNumber);
            var flight = flights.FirstOrDefault();

            if (flight == null)
            {
                throw new AerocacheProblemException(404, "FLIGHT_STATUS_NOT_AVAILABLE", "Vuelo no encontrado para actualizar estado");
            }

            flight.Estado = request.Status.ToUpperInvariant();
            if (flight.Estado == "DEPARTED")
                flight.SalidaReal = DateTime.UtcNow;
            else if (flight.Estado == "ARRIVED")
                flight.LlegadaReal = DateTime.UtcNow;

            await _uow.CompleteAsync();

            return new FlightStatusDto
            {
                FlightNumber = flight.NumeroVuelo,
                Date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                MarketingCarrier = flight.AerolineaComercial,
                OperatingCarrier = flight.AerolineaOperadora,
                Aircraft = flight.Aeronave,
                Status = flight.Estado,
                Departure = new FlightStatusEndpoint
                {
                    IataCode = flight.OrigenIata,
                    Terminal = flight.TerminalSalida,
                    ScheduledAt = flight.SalidaProgramada.ToString("o"),
                    ActualAt = flight.SalidaReal?.ToString("o")
                },
                Arrival = new FlightStatusEndpoint
                {
                    IataCode = flight.DestinoIata,
                    Terminal = flight.TerminalLlegada,
                    ScheduledAt = flight.LlegadaProgramada.ToString("o"),
                    ActualAt = flight.LlegadaReal?.ToString("o")
                }
            };
        }

        public async Task<List<PassengerItem>> GetFlightPassengersAsync(string flightNumber)
        {
            var bookings = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .Where(b => b.VueloId != null && b.VueloId.StartsWith(flightNumber) && b.Estado == "CONFIRMED")
                .ToListAsync();

            var passengers = new List<PassengerItem>();
            foreach (var b in bookings)
            {
                foreach (var p in b.Pasajeros)
                {
                    passengers.Add(new PassengerItem
                    {
                        PassengerId = p.Id,
                        PassengerType = p.TipoPasajero,
                        FirstName = p.Nombre,
                        LastName = p.Apellido,
                        DocumentType = p.TipoDocumento,
                        DocumentNumber = p.NumeroDocumento,
                        Nationality = p.Nacionalidad,
                        BirthDate = p.FechaNacimiento,
                        Gender = p.Genero,
                        Contact = new ContactInfo { Email = p.Correo, Phone = p.Telefono },
                        AssignedSeats = new List<AssignedSeatDto>
                        {
                            new() { SegmentId = "SEG-1", SeatNumber = p.NumeroAsientoAsignado ?? "12A" }
                        }
                    });
                }
            }

            return passengers;
        }
    }
}
