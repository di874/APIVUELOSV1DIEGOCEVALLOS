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

            var booking = await _uow.Bookings.Query()
                .Include(b => b.Passengers)
                .Include(b => b.BoardingPasses)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");

            if (booking.Status == "CANCELLED")
                throw new AerocacheProblemException(409, "CHECK_IN_NOT_AVAILABLE", "No se puede realizar check-in de un vuelo cancelado");

            string segmentId = $"SEG-{booking.FlightId ?? "0"}";
            var checkedPassengers = new List<CheckedInPassengerDto>();

            int seatCounter = 12;
            foreach (var passenger in booking.Passengers)
            {
                passenger.IsCheckedIn = true;
                if (string.IsNullOrWhiteSpace(passenger.AssignedSeatNumber))
                {
                    passenger.AssignedSeatNumber = $"{seatCounter++}A";
                }

                // Check if Boarding Pass already exists, if not generate one
                var bp = booking.BoardingPasses.FirstOrDefault(b => b.PassengerId == passenger.Id);
                if (bp == null)
                {
                    bp = new BoardingPass
                    {
                        BookingId = booking.BookingId,
                        PassengerId = passenger.Id,
                        SegmentId = segmentId,
                        Seat = passenger.AssignedSeatNumber,
                        BoardingGroup = "Grupo 2",
                        BoardingPosition = new Random().Next(1, 40).ToString(),
                        Barcode = $"M1{passenger.LastName}/{passenger.FirstName}  EAC1401 {passenger.AssignedSeatNumber} {booking.Pnr}",
                        BarcodeType = "QR",
                        CreatedAt = DateTime.UtcNow
                    };
                    booking.BoardingPasses.Add(bp);
                }

                checkedPassengers.Add(new CheckedInPassengerDto
                {
                    PassengerId = passenger.Id,
                    Status = "CHECKED_IN",
                    Segments = new List<CheckedInSegmentDto>
                    {
                        new() { SegmentId = segmentId, Seat = passenger.AssignedSeatNumber, Status = "CHECKED_IN" }
                    }
                });
            }

            booking.UpdatedAt = DateTime.UtcNow;
            await _uow.CompleteAsync();

            return new CheckInResponse
            {
                BookingId = booking.BookingId.ToString(),
                Status = "COMPLETED",
                CheckedInPassengers = checkedPassengers
            };
        }

        public async Task<BoardingPassListResponse> GetBoardingPassesAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");

            var passes = await _uow.BoardingPasses.FindAsync(b => b.BookingId == id);
            if (!passes.Any())
            {
                // Auto check-in to provide boarding passes if booking is confirmed
                var checkInRes = await PerformCheckInAsync(bookingId);
                passes = await _uow.BoardingPasses.FindAsync(b => b.BookingId == id);
            }

            return new BoardingPassListResponse
            {
                BookingId = bookingId,
                BoardingPasses = passes.Select(b => new BoardingPassDto
                {
                    PassengerId = b.PassengerId,
                    SegmentId = b.SegmentId,
                    Seat = b.Seat,
                    BoardingGroup = b.BoardingGroup,
                    BoardingPosition = b.BoardingPosition,
                    Barcode = b.Barcode,
                    BarcodeType = b.BarcodeType
                }).ToList()
            };
        }
    }
}
