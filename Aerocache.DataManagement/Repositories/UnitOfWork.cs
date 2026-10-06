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
            Vuelos = new GenericRepository<Vuelo>(_context);
            TarifasCabina = new GenericRepository<TarifaCabina>(_context);
            Asientos = new GenericRepository<Asiento>(_context);
            BloqueosTemporales = new GenericRepository<BloqueoTemporal>(_context);
            Reservas = new GenericRepository<Reserva>(_context);
            Pasajeros = new GenericRepository<Pasajero>(_context);
            Boletos = new GenericRepository<Boleto>(_context);
            PasesAbordar = new GenericRepository<PaseAbordar>(_context);
            CotizacionesCancelacion = new GenericRepository<CotizacionCancelacion>(_context);
            OfertasCambioFecha = new GenericRepository<OfertaCambioFecha>(_context);
            SuscripcionesWebhooks = new GenericRepository<SuscripcionWebhook>(_context);
            RegistrosIdempotencia = new GenericRepository<RegistroIdempotencia>(_context);
        }

        public IGenericRepository<Vuelo> Vuelos { get; }
        public IGenericRepository<TarifaCabina> TarifasCabina { get; }
        public IGenericRepository<Asiento> Asientos { get; }
        public IGenericRepository<BloqueoTemporal> BloqueosTemporales { get; }
        public IGenericRepository<Reserva> Reservas { get; }
        public IGenericRepository<Pasajero> Pasajeros { get; }
        public IGenericRepository<Boleto> Boletos { get; }
        public IGenericRepository<PaseAbordar> PasesAbordar { get; }
        public IGenericRepository<CotizacionCancelacion> CotizacionesCancelacion { get; }
        public IGenericRepository<OfertaCambioFecha> OfertasCambioFecha { get; }
        public IGenericRepository<SuscripcionWebhook> SuscripcionesWebhooks { get; }
        public IGenericRepository<RegistroIdempotencia> RegistrosIdempotencia { get; }

        public async Task<int> CompleteAsync() => await _context.SaveChangesAsync();

        public void Dispose() => _context.Dispose();
    }
}
