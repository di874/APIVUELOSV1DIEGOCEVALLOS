using Microsoft.EntityFrameworkCore;
using Aerocache.DataAccess.Entities;

namespace Aerocache.DataAccess.Context
{
    public class AerocacheDbContext : DbContext
    {
        public AerocacheDbContext(DbContextOptions<AerocacheDbContext> options) : base(options) { }

        public DbSet<Flight> Flights => Set<Flight>();
        public DbSet<CabinFare> CabinFares => Set<CabinFare>();
        public DbSet<Seat> Seats => Set<Seat>();
        public DbSet<HoldRecord> Holds => Set<HoldRecord>();
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<Passenger> Passengers => Set<Passenger>();
        public DbSet<Ticket> Tickets => Set<Ticket>();
        public DbSet<BoardingPass> BoardingPasses => Set<BoardingPass>();
        public DbSet<CancellationQuoteRecord> CancellationQuotes => Set<CancellationQuoteRecord>();
        public DbSet<DateChangeOfferRecord> DateChangeOffers => Set<DateChangeOfferRecord>();
        public DbSet<WebhookSubscriptionRecord> WebhookSubscriptions => Set<WebhookSubscriptionRecord>();
        public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Flight>().HasKey(x => x.Id);
            modelBuilder.Entity<CabinFare>().HasKey(x => x.Id);
            modelBuilder.Entity<Seat>().HasKey(x => x.Id);
            modelBuilder.Entity<HoldRecord>().HasKey(x => x.HoldId);
            modelBuilder.Entity<Booking>().HasKey(x => x.BookingId);
            modelBuilder.Entity<Passenger>().HasKey(x => x.Id);
            modelBuilder.Entity<Ticket>().HasKey(x => x.TicketId);
            modelBuilder.Entity<BoardingPass>().HasKey(x => x.Id);
            modelBuilder.Entity<CancellationQuoteRecord>().HasKey(x => x.QuoteId);
            modelBuilder.Entity<DateChangeOfferRecord>().HasKey(x => x.ChangeOfferId);
            modelBuilder.Entity<WebhookSubscriptionRecord>().HasKey(x => x.Id);
            modelBuilder.Entity<IdempotencyRecord>().HasKey(x => x.Key);

            modelBuilder.Entity<Flight>()
                .HasMany(f => f.CabinFares)
                .WithOne(c => c.Flight)
                .HasForeignKey(c => c.FlightId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Flight>()
                .HasMany(f => f.Seats)
                .WithOne(s => s.Flight)
                .HasForeignKey(s => s.FlightId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Booking>()
                .HasMany(b => b.Passengers)
                .WithOne(p => p.Booking)
                .HasForeignKey(p => p.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Booking>()
                .HasMany(b => b.Tickets)
                .WithOne(t => t.Booking)
                .HasForeignKey(t => t.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Booking>()
                .HasMany(b => b.BoardingPasses)
                .WithOne(bp => bp.Booking)
                .HasForeignKey(bp => bp.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
