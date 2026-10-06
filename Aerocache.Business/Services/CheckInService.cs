using System;
using System.Collections.Generic;
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
    public class CheckInService : ICheckInService
    {
        private readonly IUnitOfWork _uow;

        public CheckInService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<CheckInResponse> PerformCheckInAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .Include(b => b.PasesAbordar)
                .FirstOrDefaultAsync(b => b.ReservaId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Estado == "CANCELLED")
                throw new AerocacheProblemException(409, "CHECK_IN_NOT_AVAILABLE", "No se puede realizar check-in de un vuelo cancelado");

            string segmentId = $"SEG-{booking.VueloId ?? "0"}";
            var checkedPassengers = new List<CheckedInPassengerDto>();

            int seatCounter = 12;
            foreach (var passenger in booking.Pasajeros)
            {
                passenger.TieneCheckIn = true;
                if (string.IsNullOrWhiteSpace(passenger.NumeroAsientoAsignado))
                {
                    passenger.NumeroAsientoAsignado = $"{seatCounter++}A";
                }

                // Check if Boarding Pass already exists, if not generate one
                var bp = booking.PasesAbordar.FirstOrDefault(b => b.PasajeroId == passenger.Id);
                if (bp == null)
                {
                    bp = new PaseAbordar
                    {
                        ReservaId = booking.ReservaId,
                        PasajeroId = passenger.Id,
                        SegmentoId = segmentId,
                        Asiento = passenger.NumeroAsientoAsignado,
                        GrupoAbordaje = "Grupo 2",
                        PosicionAbordaje = new Random().Next(1, 40).ToString(),
                        CodigoBarras = $"M1{passenger.Apellido}/{passenger.Nombre}  EAC1401 {passenger.NumeroAsientoAsignado} {booking.Pnr}",
                        TipoCodigoBarras = "QR",
                        FechaCreacion = DateTime.UtcNow
                    };
                    booking.PasesAbordar.Add(bp);
                }

                checkedPassengers.Add(new CheckedInPassengerDto
                {
                    PassengerId = passenger.Id,
                    Status = "CHECKED_IN",
                    Segments = new List<CheckedInSegmentDto>
                    {
                        new() { SegmentId = segmentId, Seat = passenger.NumeroAsientoAsignado, Status = "CHECKED_IN" }
                    }
                });
            }

            booking.FechaActualizacion = DateTime.UtcNow;
            await _uow.CompleteAsync();

            return new CheckInResponse
            {
                BookingId = booking.ReservaId.ToString(),
                Status = "COMPLETED",
                CheckedInPassengers = checkedPassengers
            };
        }

        public async Task<BoardingPassListResponse> GetBoardingPassesAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var passes = await _uow.PasesAbordar.FindAsync(b => b.ReservaId == id);
            if (!passes.Any())
            {
                // Auto check-in to provide boarding passes if booking is confirmed
                var checkInRes = await PerformCheckInAsync(bookingId);
                passes = await _uow.PasesAbordar.FindAsync(b => b.ReservaId == id);
            }

            return new BoardingPassListResponse
            {
                BookingId = bookingId,
                BoardingPasses = passes.Select(b => new BoardingPassDto
                {
                    PassengerId = b.PasajeroId,
                    SegmentId = b.SegmentoId,
                    Seat = b.Asiento,
                    BoardingGroup = b.GrupoAbordaje,
                    BoardingPosition = b.PosicionAbordaje,
                    Barcode = b.CodigoBarras,
                    BarcodeType = b.TipoCodigoBarras
                }).ToList()
            };
        }
    }
}
