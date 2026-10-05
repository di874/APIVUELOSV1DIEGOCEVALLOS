using Aerocache.Business.Exceptions;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Aerocache.Business.DTOs
{
    public class MoneyAmount
    {
        public string Currency { get; set; } = "USD";
        public string? BaseFare { get; set; }
        public string? Taxes { get; set; }
        public string Total { get; set; } = "0.00";
    }

    public class FlightEndpoint
    {
        public string IataCode { get; set; } = string.Empty;
        public string At { get; set; } = string.Empty; // ISO 8601 string
        public string? Terminal { get; set; }
    }

    public class FlightSegmentDto
    {
        public string SegmentId { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public FlightEndpoint Departure { get; set; } = new();
        public FlightEndpoint Arrival { get; set; } = new();
        public int? LayoverMinutes { get; set; }
        public string MarketingCarrier { get; set; } = "AC";
        public string OperatingCarrier { get; set; } = "AC";
        public string? Aircraft { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Status { get; set; } // SCHEDULED, BOARDING, DEPARTED, DELAYED, ARRIVED, CANCELLED, DIVERTED
    }

    public class FareRulesDto
    {
        public bool IsRefundable { get; set; }
        public bool IsChangeable { get; set; }
    }

    public class BaggageAllowanceDto
    {
        public bool? PersonalItemIncluded { get; set; } = true;
        public int? CarryOnIncluded { get; set; }
        public int? CheckedBaggageIncluded { get; set; }
    }

    public class PassengerPriceDto
    {
        public string? PassengerType { get; set; }
        public MoneyAmount? Price { get; set; }
    }

    public class CabinPricingDto
    {
        public string CabinClass { get; set; } = "ECONOMY"; // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
        public string FareBrand { get; set; } = "Light";
        public int AvailableSeats { get; set; }
        public FareRulesDto FareRules { get; set; } = new();
        public BaggageAllowanceDto BaggageAllowance { get; set; } = new();
        public MoneyAmount? ExtraCheckedBaggagePrice { get; set; }
        public List<PassengerPriceDto> PricePerPassengerType { get; set; } = new();
    }

    public class ItineraryOptionDto
    {
        public string ItineraryId { get; set; } = string.Empty;
        public int TotalDurationMinutes { get; set; }
        public int StopsCount { get; set; }
        public List<FlightSegmentDto> Segments { get; set; } = new();
        public List<CabinPricingDto> PricingOptions { get; set; } = new();
    }

    public class AirlineInfoDto
    {
        public string? Code { get; set; } = "AC";
        public string? Name { get; set; } = "AEROCACHE";
    }

    public class FlightOfferDto
    {
        public string OfferId { get; set; } = string.Empty;
        public AirlineInfoDto Airline { get; set; } = new();
        public List<ItineraryOptionDto> Itineraries { get; set; } = new();
        public MoneyAmount GrandTotal { get; set; } = new();
    }

    public class PassengerBreakdown
    {
        public int Adults { get; set; } = 1;
        public int Youths { get; set; } = 0;
        public int Children { get; set; } = 0;
        public int Infants { get; set; } = 0;
    }

    public class ItinerarySearchItem
    {
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string DepartureDate { get; set; } = string.Empty; // YYYY-MM-DD
    }

    public class SearchRequest
    {
        public List<ItinerarySearchItem> Itineraries { get; set; } = new();
        public PassengerBreakdown Passengers { get; set; } = new();
    }

    public class SearchResponse
    {
        public int TotalOffers { get; set; }
        public List<FlightOfferDto> Offers { get; set; } = new();
    }

    public class SeatMapSeatDto
    {
        public string SeatNumber { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
        public List<string> Characteristics { get; set; } = new();
    }

    public class SeatMapRowDto
    {
        public int RowNumber { get; set; }
        public List<SeatMapSeatDto> Seats { get; set; } = new();
    }

    public class SeatMapCabinDto
    {
        public string CabinClass { get; set; } = "ECONOMY";
        public List<SeatMapRowDto> Rows { get; set; } = new();
    }

    public class SeatMapResponse
    {
        public string? SegmentId { get; set; }
        public List<SeatMapCabinDto> Cabins { get; set; } = new();
    }

    public class ItinerarySelectionDto
    {
        public string ItineraryId { get; set; } = string.Empty;
        public string CabinClass { get; set; } = "ECONOMY";
        public string FareBrand { get; set; } = "Light";
    }

    public class HoldRequest
    {
        public string OfferId { get; set; } = string.Empty;
        public List<ItinerarySelectionDto> ItinerarySelections { get; set; } = new();
        public PassengerBreakdown PassengersBreakdown { get; set; } = new();
    }

    public class HoldResponse
    {
        public string HoldId { get; set; } = string.Empty;
        public string Status { get; set; } = "HELD";
        public string ExpiresAt { get; set; } = string.Empty;
        public int TtlMinutes { get; set; } = 15;
        public MoneyAmount LockedPrice { get; set; } = new();
    }

    public class HoldStatusResponse
    {
        public string Status { get; set; } = "HELD"; // HELD, RELEASED, EXPIRED, CONSUMED
        public string? ExpiresAt { get; set; }
        public int RemainingSeconds { get; set; }
        public MoneyAmount LockedPrice { get; set; } = new();
    }

    public class ContactInfo
    {
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class AssignedSeatDto
    {
        public string SegmentId { get; set; } = string.Empty;
        public string SeatNumber { get; set; } = string.Empty;
    }

    public class ExtraBaggageDto
    {
        public string ItineraryId { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class PassengerItem
    {
        public string PassengerId { get; set; } = string.Empty;
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
        public ContactInfo Contact { get; set; } = new();
        public List<AssignedSeatDto>? AssignedSeats { get; set; }
        public List<ExtraBaggageDto>? ExtraBaggage { get; set; }
    }

    public class PaymentReference
    {
        public string PaymentReferenceValue { get; set; } = string.Empty;
    }

    public class BookingRequest
    {
        public string HoldId { get; set; } = string.Empty;
        public List<PassengerItem> Passengers { get; set; } = new();
        public PaymentReference Payment { get; set; } = new();
    }

    public class TicketSegmentDto
    {
        public string SegmentId { get; set; } = string.Empty;
        public string Status { get; set; } = "ISSUED"; // PENDING, ISSUED, FAILED
        public string? CouponNumber { get; set; }
    }

    public class TicketDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string BookingId { get; set; } = string.Empty;
        public string PassengerId { get; set; } = string.Empty;
        public string? ETicketNumber { get; set; }
        public string Status { get; set; } = "ISSUED"; // PENDING, ISSUING, ISSUED, FAILED, VOIDED, REFUNDED
        public string? IssuedAt { get; set; }
        public List<TicketSegmentDto> Segments { get; set; } = new();
        public string? FailureReason { get; set; }
    }

    public class TicketListResponse
    {
        public string BookingId { get; set; } = string.Empty;
        public List<TicketDto> Tickets { get; set; } = new();
    }

    public class ChangeHistoryItem
    {
        public string? ChangedAt { get; set; }
        public string? Description { get; set; }
    }

    public class BookingDetail
    {
        public string BookingId { get; set; } = string.Empty;
        public string Pnr { get; set; } = string.Empty;
        public string Status { get; set; } = "CONFIRMED";
        public MoneyAmount GrandTotal { get; set; } = new();
        public string CreatedAt { get; set; } = string.Empty;
        public string? UpdatedAt { get; set; }
        public List<ItineraryOptionDto> Itineraries { get; set; } = new();
        public List<PassengerItem> Passengers { get; set; } = new();
        public List<TicketDto> Tickets { get; set; } = new();
        public List<ChangeHistoryItem>? Changes { get; set; }
    }

    public class BookingSummaryItem
    {
        public string? BookingId { get; set; }
        public string? Pnr { get; set; }
        public string? Status { get; set; }
        public string? Origin { get; set; }
        public string? Destination { get; set; }
        public string? DepartureDate { get; set; }
        public MoneyAmount? GrandTotal { get; set; }
    }

    public class BookingListResponse
    {
        public string? NextCursor { get; set; }
        public List<BookingSummaryItem> Items { get; set; } = new();
    }

    public class BaggageOptionItem
    {
        public string? PassengerId { get; set; }
        public string? ItineraryId { get; set; }
        public MoneyAmount? Price { get; set; }
        public int MaxAllowed { get; set; } = 3;
        public int AlreadyPurchased { get; set; } = 0;
    }

    public class AddBaggageRequest
    {
        public string PassengerId { get; set; } = string.Empty;
        public string ItineraryId { get; set; } = string.Empty;
        public int Quantity { get; set; } = 1;
        public PaymentReference Payment { get; set; } = new();
    }

    public class BaggageAddedResponse
    {
        public string? PassengerId { get; set; }
        public string? ItineraryId { get; set; }
        public int TotalBaggage { get; set; }
    }

    public class DateChangeSearchItem
    {
        public string ItineraryId { get; set; } = string.Empty;
        public string NewDepartureDate { get; set; } = string.Empty;
    }

    public class DateChangeSearchRequest
    {
        public List<DateChangeSearchItem> Changes { get; set; } = new();
    }

    public class PriceDifferenceDto
    {
        public string FareDifference { get; set; } = "0.00";
        public string TaxDifference { get; set; } = "0.00";
        public string ChangeFee { get; set; } = "0.00";
        public string TotalToPay { get; set; } = "0.00";
    }

    public class DateChangeSearchOption
    {
        public string ChangeOfferId { get; set; } = string.Empty;
        public string ExpiresAt { get; set; } = string.Empty;
        public List<FlightSegmentDto> Segments { get; set; } = new();
        public PriceDifferenceDto PriceDifference { get; set; } = new();
    }

    public class DateChangeRequest
    {
        public string ChangeOfferId { get; set; } = string.Empty;
        public PaymentReference Payment { get; set; } = new();
        public List<AssignedSeatDto>? AssignedSeats { get; set; }
    }

    public class CancellationQuoteResponse
    {
        public string QuoteId { get; set; } = string.Empty;
        public bool IsRefundable { get; set; }
        public string RefundAmount { get; set; } = "0.00";
        public string PenaltyAmount { get; set; } = "0.00";
        public string Currency { get; set; } = "USD";
        public string ExpiresAt { get; set; } = string.Empty;
    }

    public class CancelBookingRequest
    {
        public string QuoteId { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    public class CheckedInSegmentDto
    {
        public string SegmentId { get; set; } = string.Empty;
        public string? Seat { get; set; }
        public string Status { get; set; } = "CHECKED_IN";
    }

    public class CheckedInPassengerDto
    {
        public string PassengerId { get; set; } = string.Empty;
        public string Status { get; set; } = "CHECKED_IN";
        public List<CheckedInSegmentDto> Segments { get; set; } = new();
    }

    public class CheckInResponse
    {
        public string BookingId { get; set; } = string.Empty;
        public string Status { get; set; } = "COMPLETED"; // NOT_ELIGIBLE, AVAILABLE, IN_PROGRESS, COMPLETED, FAILED
        public List<CheckedInPassengerDto> CheckedInPassengers { get; set; } = new();
    }

    public class BoardingPassDto
    {
        public string PassengerId { get; set; } = string.Empty;
        public string SegmentId { get; set; } = string.Empty;
        public string Seat { get; set; } = string.Empty;
        public string? BoardingGroup { get; set; }
        public string? BoardingPosition { get; set; }
        public string Barcode { get; set; } = string.Empty;
        public string BarcodeType { get; set; } = "QR"; // AZTEC, PDF417, QR
    }

    public class BoardingPassListResponse
    {
        public string BookingId { get; set; } = string.Empty;
        public List<BoardingPassDto> BoardingPasses { get; set; } = new();
    }

    public class FlightStatusEndpoint
    {
        public string IataCode { get; set; } = string.Empty;
        public string? Terminal { get; set; }
        public string ScheduledAt { get; set; } = string.Empty;
        public string? EstimatedAt { get; set; }
        public string? ActualAt { get; set; }
    }

    public class FlightStatusDto
    {
        public string FlightNumber { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string MarketingCarrier { get; set; } = "AC";
        public string OperatingCarrier { get; set; } = "AC";
        public FlightStatusEndpoint Departure { get; set; } = new();
        public FlightStatusEndpoint Arrival { get; set; } = new();
        public string? Aircraft { get; set; }
        public string Status { get; set; } = "SCHEDULED";
    }

    public class WebhookSubscriptionDto
    {
        public string? Id { get; set; }
        public string Url { get; set; } = string.Empty;
        public List<string> Events { get; set; } = new();
        public string Secret { get; set; } = string.Empty;
    }

    public class ProblemDetailsDto
    {
        public string Type { get; set; } = "https://httpstatuses.com/400";
        public string Title { get; set; } = "Bad Request";
        public int Status { get; set; } = 400;
        public string? Detail { get; set; }
        public string Code { get; set; } = "VALIDATION_FAILED";
        public List<InvalidParamDto>? InvalidParams { get; set; }
    }

    public class ChangeSeatRequest
    {
        public string? PassengerId { get; set; }
        public string NewSeatNumber { get; set; } = string.Empty;
    }

    public class ChangeSeatResponse
    {
        public string BookingId { get; set; } = string.Empty;
        public string PassengerId { get; set; } = string.Empty;
        public string SeatNumber { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}

