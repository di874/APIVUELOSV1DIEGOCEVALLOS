using System;
using System.Threading.Tasks;
using Aerocache.DataAccess.Entities;

namespace Aerocache.DataManagement.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IGenericRepository<Vuelo> Vuelos { get; }
        IGenericRepository<TarifaCabina> TarifasCabina { get; }
        IGenericRepository<Asiento> Asientos { get; }
        IGenericRepository<BloqueoTemporal> BloqueosTemporales { get; }
        IGenericRepository<Reserva> Reservas { get; }
        IGenericRepository<Pasajero> Pasajeros { get; }
        IGenericRepository<Boleto> Boletos { get; }
        IGenericRepository<PaseAbordar> PasesAbordar { get; }
        IGenericRepository<CotizacionCancelacion> CotizacionesCancelacion { get; }
        IGenericRepository<OfertaCambioFecha> OfertasCambioFecha { get; }
        IGenericRepository<SuscripcionWebhook> SuscripcionesWebhooks { get; }
        IGenericRepository<RegistroIdempotencia> RegistrosIdempotencia { get; }

        Task<int> CompleteAsync();
    }
}
