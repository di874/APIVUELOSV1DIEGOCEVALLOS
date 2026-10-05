using System;
using System.Collections.Generic;

namespace Aerocache.DataAccess.Entities
{
    public class Flight
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FlightNumber { get; set; } = string.Empty; // e.g. "AC1401"
        public string MarketingCarrier { get; set; } = "AC"; // Aerocache
        public string OperatingCarrier { get; set; } = "AC";
        public string AirlineName { get; set; } = "AEROCACHE";
        public string Aircraft { get; set; } = "Airbus A320";
        public string OriginIata { get; set; } = string.Empty; // UIO, GYE, CUE
        public string DestinationIata { get; set; } = string.Empty; // UIO, GYE, CUE
        public DateTime ScheduledDeparture { get; set; }
        public DateTime ScheduledArrival { get; set; }
        public DateTime? EstimatedDeparture { get; set; }
        public DateTime? EstimatedArrival { get; set; }
        public DateTime? ActualDeparture { get; set; }
        public DateTime? ActualArrival { get; set; }
        public int DurationMinutes { get; set; }
        public string TerminalDeparture { get; set; } = "T1";
        public string TerminalArrival { get; set; } = "T1";
        public string Status { get; set; } = "SCHEDULED"; // SCHEDULED, BOARDING, DEPARTED, DELAYED, ARRIVED, CANCELLED

        public List<CabinFare> CabinFares { get; set; } = new();
        public List<Seat> Seats { get; set; } = new();
    }

    public class CabinFare
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FlightId { get; set; } = string.Empty;
        public Flight? Flight { get; set; }
        public string CabinClass { get; set; } = "ECONOMY"; // ECONOMY, PREMIUM_ECONOMY, BUSINESS
        public string FareBrand { get; set; } = "Light"; // Light, Plus, Top
        public int AvailableSeats { get; set; } = 40;
        public decimal BaseFare { get; set; }
        public decimal Taxes { get; set; }
        public decimal TotalPrice { get; set; }
        public string Currency { get; set; } = "USD";
        public bool IsRefundable { get; set; } = false;
        public bool IsChangeable { get; set; } = true;
        public bool PersonalItemIncluded { get; set; } = true;
        public int CarryOnIncluded { get; set; } = 1;
        public int CheckedBaggageIncluded { get; set; } = 0;
        public decimal ExtraBaggagePrice { get; set; } = 25.00m;
    }

    public class Seat
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FlightId { get; set; } = string.Empty;
        public Flight? Flight { get; set; }
        public string SegmentId { get; set; } = string.Empty;
        public string CabinClass { get; set; } = "ECONOMY";
        public int RowNumber { get; set; }
        public string SeatNumber { get; set; } = string.Empty; // e.g. "12A"
        public bool IsAvailable { get; set; } = true;
        public string Characteristics { get; set; } = "WINDOW"; // Delimited: WINDOW, AISLE, EXTRA_LEGROOM, EMERGENCY_EXIT
    }

    public class HoldRecord
    {
        public Guid HoldId { get; set; } = Guid.NewGuid();
        public string OfferId { get; set; } = string.Empty;
        public string FlightId { get; set; } = string.Empty;
        public string ItineraryId { get; set; } = string.Empty;
        public string CabinClass { get; set; } = "ECONOMY";
        public string FareBrand { get; set; } = "Light";
        public decimal LockedBaseFare { get; set; }
        public decimal LockedTaxes { get; set; }
        public decimal LockedTotal { get; set; }
        public string Currency { get; set; } = "USD";
        public string Status { get; set; } = "HELD"; // HELD, RELEASED, EXPIRED, CONSUMED
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(15);
        public int TtlMinutes { get; set; } = 15;
        public int Adults { get; set; } = 1;
        public int Youths { get; set; } = 0;
        public int Children { get; set; } = 0;
        public int Infants { get; set; } = 0;
    }

    public class Booking
    {
        public Guid BookingId { get; set; } = Guid.NewGuid();
        public string Pnr { get; set; } = string.Empty; // 6 alphanumeric
        public string Status { get; set; } = "CONFIRMED"; // PENDING, PENDING_PAYMENT, TICKET_ISSUING, CONFIRMED, FAILED, CHANGE_PENDING, CANCELLATION_PENDING, CANCELLED
        public decimal GrandTotalBase { get; set; }
        public decimal GrandTotalTaxes { get; set; }
        public decimal GrandTotalAmount { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string PaymentReference { get; set; } = string.Empty;
        public string? FlightId { get; set; }
        public string? ItineraryId { get; set; }
        public string? CabinClass { get; set; }
        public string? FareBrand { get; set; }
        public string OriginIata { get; set; } = string.Empty;
        public string DestinationIata { get; set; } = string.Empty;
        public DateTime DepartureDate { get; set; }
        public string? ChangesHistoryJson { get; set; }
        public string? CancellationReason { get; set; }

        public List<Passenger> Passengers { get; set; } = new();
        public List<Ticket> Tickets { get; set; } = new();
        public List<BoardingPass> BoardingPasses { get; set; } = new();
    }

    public class Passenger
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public Guid BookingId { get; set; }
        public Booking? Booking { get; set; }
        public string PassengerType { get; set; } = "ADULT"; // ADULT, YOUTH, CHILD, INFANT
        public string? AssociatedAdultId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "NATIONAL_ID"; // PASSPORT, NATIONAL_ID
        public string DocumentNumber { get; set; } = string.Empty;
        public string Nationality { get; set; } = "EC";
        public string? DocumentExpiryDate { get; set; }
        public string BirthDate { get; set; } = string.Empty;
        public string Gender { get; set; } = "M"; // M, F, X
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? AssignedSeatNumber { get; set; }
        public int ExtraBaggageQuantity { get; set; } = 0;
        public bool IsCheckedIn { get; set; } = false;
    }

    public class Ticket
    {
        public string TicketId { get; set; } = "TK-" + Guid.NewGuid().ToString("N")[..8].ToUpper();
        public Guid BookingId { get; set; }
        public Booking? Booking { get; set; }
        public string PassengerId { get; set; } = string.Empty;
        public string ETicketNumber { get; set; } = "045-" + new Random().Next(100000000, 999999999).ToString();
        public string Status { get; set; } = "ISSUED"; // PENDING, ISSUING, ISSUED, FAILED, VOIDED, REFUNDED
        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public string SegmentId { get; set; } = string.Empty;
        public string CouponNumber { get; set; } = "CP-1";
        public string? FailureReason { get; set; }
    }

    public class BoardingPass
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public Guid BookingId { get; set; }
        public Booking? Booking { get; set; }
        public string PassengerId { get; set; } = string.Empty;
        public string SegmentId { get; set; } = string.Empty;
        public string Seat { get; set; } = string.Empty;
        public string BoardingGroup { get; set; } = "Grupo 2";
        public string BoardingPosition { get; set; } = "15";
        public string Barcode { get; set; } = string.Empty;
        public string BarcodeType { get; set; } = "QR"; // AZTEC, PDF417, QR
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CancellationQuoteRecord
    {
        public string QuoteId { get; set; } = "QTE-" + Guid.NewGuid().ToString("N")[..8].ToUpper();
        public Guid BookingId { get; set; }
        public bool IsRefundable { get; set; }
        public decimal RefundAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(30);
    }

    public class DateChangeOfferRecord
    {
        public string ChangeOfferId { get; set; } = "CHG-" + Guid.NewGuid().ToString("N")[..8].ToUpper();
        public Guid BookingId { get; set; }
        public DateTime NewDepartureDate { get; set; }
        public decimal FareDifference { get; set; }
        public decimal TaxDifference { get; set; }
        public decimal ChangeFee { get; set; }
        public decimal TotalToPay { get; set; }
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(20);
    }

    public class WebhookSubscriptionRecord
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Url { get; set; } = string.Empty;
        public string EventsJson { get; set; } = "[]";
        public string Secret { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class IdempotencyRecord
    {
        public string Key { get; set; } = string.Empty;
        public int StatusCode { get; set; }
        public string ResponseBody { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
