using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Aerocache.Business.DTOs;

namespace Aerocache.Business.Interfaces
{
    public interface IFlightSearchService
    {
        Task<SearchResponse> SearchFlightsAsync(SearchRequest request, string? deviceFingerprint);
        Task<SeatMapResponse> GetSeatMapAsync(string offerId, string segmentId);
    }

    public interface IHoldService
    {
        Task<HoldResponse> CreateHoldAsync(HoldRequest request, string? idempotencyKey);
        Task<HoldStatusResponse> GetHoldStatusAsync(string holdId);
        Task ReleaseHoldAsync(string holdId);
    }

    public interface IBookingService
    {
        Task<BookingDetail> CreateBookingAsync(BookingRequest request, string? idempotencyKey);
        Task<BookingDetail> GetBookingDetailAsync(string bookingId);
        Task<BookingListResponse> ListBookingsAsync(string? pnr, string? status, string? createdFrom, string? createdTo, int limit, string? cursor);
        Task<TicketListResponse> GetBookingTicketsAsync(string bookingId);
        Task<TicketDto> GetTicketAsync(string bookingId, string ticketId);
    }

    public interface IPostSaleService
    {
        Task<List<BaggageOptionItem>> GetBaggageOptionsAsync(string bookingId);
        Task<BaggageAddedResponse> AddBaggageAsync(string bookingId, AddBaggageRequest request, string? idempotencyKey);
        Task<List<DateChangeSearchOption>> SearchDateChangeAsync(string bookingId, DateChangeSearchRequest request);
        Task<BookingDetail> ConfirmDateChangeAsync(string bookingId, DateChangeRequest request, string? idempotencyKey);
        Task<CancellationQuoteResponse> GetCancellationQuoteAsync(string bookingId);
        Task CancelBookingAsync(string bookingId, CancelBookingRequest request, string? idempotencyKey);
        Task<ChangeSeatResponse> ChangeSeatAsync(string bookingId, ChangeSeatRequest request);
    }

    public interface ICheckInService
    {
        Task<CheckInResponse> PerformCheckInAsync(string bookingId);
        Task<BoardingPassListResponse> GetBoardingPassesAsync(string bookingId);
    }

    public interface IFlightStatusService
    {
        Task<FlightStatusDto> GetFlightStatusAsync(string flightNumber, string date);
    }

    public interface IWebhookService
    {
        Task<List<WebhookSubscriptionDto>> ListSubscriptionsAsync();
        Task<WebhookSubscriptionDto> CreateSubscriptionAsync(WebhookSubscriptionDto subscription);
        Task DeleteSubscriptionAsync(string id);
    }
}
