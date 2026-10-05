using System;
using System.Threading.Tasks;
using Aerocache.DataAccess.Entities;

namespace Aerocache.DataManagement.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IGenericRepository<Flight> Flights { get; }
        IGenericRepository<CabinFare> CabinFares { get; }
        IGenericRepository<Seat> Seats { get; }
        IGenericRepository<HoldRecord> Holds { get; }
        IGenericRepository<Booking> Bookings { get; }
        IGenericRepository<Passenger> Passengers { get; }
        IGenericRepository<Ticket> Tickets { get; }
        IGenericRepository<BoardingPass> BoardingPasses { get; }
        IGenericRepository<CancellationQuoteRecord> CancellationQuotes { get; }
        IGenericRepository<DateChangeOfferRecord> DateChangeOffers { get; }
        IGenericRepository<WebhookSubscriptionRecord> WebhookSubscriptions { get; }
        IGenericRepository<IdempotencyRecord> IdempotencyRecords { get; }

        Task<int> CompleteAsync();
    }
}
