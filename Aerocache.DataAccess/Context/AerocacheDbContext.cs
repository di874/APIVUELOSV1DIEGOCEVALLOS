using Microsoft.EntityFrameworkCore;
using Aerocache.DataAccess.Entities;

namespace Aerocache.DataAccess.Context
{
    public class AerocacheDbContext : DbContext
    {
        public AerocacheDbContext(DbContextOptions<AerocacheDbContext> options) : base(options) { }

        public DbSet<Vuelo> Vuelos => Set<Vuelo>();
        public DbSet<TarifaCabina> TarifasCabina => Set<TarifaCabina>();
        public DbSet<Asiento> Asientos => Set<Asiento>();
        public DbSet<BloqueoTemporal> BloqueosTemporales => Set<BloqueoTemporal>();
        public DbSet<Reserva> Reservas => Set<Reserva>();
        public DbSet<Pasajero> Pasajeros => Set<Pasajero>();
        public DbSet<Boleto> Boletos => Set<Boleto>();
        public DbSet<PaseAbordar> PasesAbordar => Set<PaseAbordar>();
        public DbSet<CotizacionCancelacion> CotizacionesCancelacion => Set<CotizacionCancelacion>();
        public DbSet<OfertaCambioFecha> OfertasCambioFecha => Set<OfertaCambioFecha>();
        public DbSet<SuscripcionWebhook> SuscripcionesWebhooks => Set<SuscripcionWebhook>();
        public DbSet<RegistroIdempotencia> RegistrosIdempotencia => Set<RegistroIdempotencia>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Vuelo>().ToTable("Vuelos").HasKey(x => x.Id);
            modelBuilder.Entity<TarifaCabina>().ToTable("TarifasCabina").HasKey(x => x.Id);
            modelBuilder.Entity<Asiento>().ToTable("Asientos").HasKey(x => x.Id);
            modelBuilder.Entity<BloqueoTemporal>().ToTable("BloqueosTemporales").HasKey(x => x.BloqueoId);
            modelBuilder.Entity<Reserva>().ToTable("Reservas").HasKey(x => x.ReservaId);
            modelBuilder.Entity<Pasajero>().ToTable("Pasajeros").HasKey(x => x.Id);
            modelBuilder.Entity<Boleto>().ToTable("Boletos").HasKey(x => x.BoletoId);
            modelBuilder.Entity<PaseAbordar>().ToTable("PasesAbordar").HasKey(x => x.Id);
            modelBuilder.Entity<CotizacionCancelacion>().ToTable("CotizacionesCancelacion").HasKey(x => x.CotizacionId);
            modelBuilder.Entity<OfertaCambioFecha>().ToTable("OfertasCambioFecha").HasKey(x => x.OfertaCambioId);
            modelBuilder.Entity<SuscripcionWebhook>().ToTable("SuscripcionesWebhooks").HasKey(x => x.Id);
            modelBuilder.Entity<RegistroIdempotencia>().ToTable("RegistrosIdempotencia").HasKey(x => x.Clave);

            modelBuilder.Entity<Vuelo>()
                .HasMany(f => f.TarifasCabina)
                .WithOne(c => c.Vuelo)
                .HasForeignKey(c => c.VueloId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Vuelo>()
                .HasMany(f => f.Asientos)
                .WithOne(s => s.Vuelo)
                .HasForeignKey(s => s.VueloId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Reserva>()
                .HasMany(b => b.Pasajeros)
                .WithOne(p => p.Reserva)
                .HasForeignKey(p => p.ReservaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Reserva>()
                .HasMany(b => b.Boletos)
                .WithOne(t => t.Reserva)
                .HasForeignKey(t => t.ReservaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Reserva>()
                .HasMany(b => b.PasesAbordar)
                .WithOne(bp => bp.Reserva)
                .HasForeignKey(bp => bp.ReservaId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
