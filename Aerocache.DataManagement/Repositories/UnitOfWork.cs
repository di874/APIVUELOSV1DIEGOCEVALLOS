using System.Threading.Tasks;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.DataManagement.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly AerocacheDbContext _context;

        public UnitOfWork(AerocacheDbContext context)
        {
            _context = context;
            Flights = new GenericRepository<Flight>(_context);
            CabinFares = new GenericRepository<CabinFare>(_context);
            Seats = new GenericRepository<Seat>(_context);
            Holds = new GenericRepository<HoldRecord>(_context);
            Bookings = new GenericRepository<Booking>(_context);
            Passengers = new GenericRepository<Passenger>(_context);
            Tickets = new GenericRepository<Ticket>(_context);
            BoardingPasses = new GenericRepository<BoardingPass>(_context);
            CancellationQuotes = new GenericRepository<CancellationQuoteRecord>(_context);
            DateChangeOffers = new GenericRepository<DateChangeOfferRecord>(_context);
            WebhookSubscriptions = new GenericRepository<WebhookSubscriptionRecord>(_context);
            IdempotencyRecords = new GenericRepository<IdempotencyRecord>(_context);
        }

        public IGenericRepository<Flight> Flights { get; }
        public IGenericRepository<CabinFare> CabinFares { get; }
        public IGenericRepository<Seat> Seats { get; }
        public IGenericRepository<HoldRecord> Holds { get; }
        public IGenericRepository<Booking> Bookings { get; }
        public IGenericRepository<Passenger> Passengers { get; }
        public IGenericRepository<Ticket> Tickets { get; }
        public IGenericRepository<BoardingPass> BoardingPasses { get; }
        public IGenericRepository<CancellationQuoteRecord> CancellationQuotes { get; }
        public IGenericRepository<DateChangeOfferRecord> DateChangeOffers { get; }
        public IGenericRepository<WebhookSubscriptionRecord> WebhookSubscriptions { get; }
        public IGenericRepository<IdempotencyRecord> IdempotencyRecords { get; }

        public async Task<int> CompleteAsync() => await _context.SaveChangesAsync();

        public void Dispose() => _context.Dispose();
    }
}
