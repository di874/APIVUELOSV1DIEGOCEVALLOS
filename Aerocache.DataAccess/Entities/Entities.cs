using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Aerocache.DataAccess.Entities
{
    [Table("Vuelos")]
    public class Vuelo
    {
        [Key]
        [Column("Id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("NumeroVuelo")]
        public string NumeroVuelo { get; set; } = string.Empty; // e.g. "AC1401"

        [Column("AerolineaComercial")]
        public string AerolineaComercial { get; set; } = "AC"; // Aerocache

        [Column("AerolineaOperadora")]
        public string AerolineaOperadora { get; set; } = "AC";

        [Column("NombreAerolinea")]
        public string NombreAerolinea { get; set; } = "AEROCACHE";

        [Column("Aeronave")]
        public string Aeronave { get; set; } = "Airbus A320";

        [Column("OrigenIata")]
        public string OrigenIata { get; set; } = string.Empty; // UIO, GYE, CUE

        [Column("DestinoIata")]
        public string DestinoIata { get; set; } = string.Empty; // UIO, GYE, CUE

        [Column("SalidaProgramada")]
        public DateTime SalidaProgramada { get; set; }

        [Column("LlegadaProgramada")]
        public DateTime LlegadaProgramada { get; set; }

        [Column("SalidaEstimada")]
        public DateTime? SalidaEstimada { get; set; }

        [Column("LlegadaEstimada")]
        public DateTime? LlegadaEstimada { get; set; }

        [Column("SalidaReal")]
        public DateTime? SalidaReal { get; set; }

        [Column("LlegadaReal")]
        public DateTime? LlegadaReal { get; set; }

        [Column("DuracionMinutos")]
        public int DuracionMinutos { get; set; }

        [Column("TerminalSalida")]
        public string TerminalSalida { get; set; } = "T1";

        [Column("TerminalLlegada")]
        public string TerminalLlegada { get; set; } = "T1";

        [Column("Estado")]
        public string Estado { get; set; } = "SCHEDULED"; // SCHEDULED, BOARDING, DEPARTED, DELAYED, ARRIVED, CANCELLED

        public List<TarifaCabina> TarifasCabina { get; set; } = new();
        public List<Asiento> Asientos { get; set; } = new();
    }

    [Table("TarifasCabina")]
    public class TarifaCabina
    {
        [Key]
        [Column("Id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("VueloId")]
        public string VueloId { get; set; } = string.Empty;
        public Vuelo? Vuelo { get; set; }

        [Column("ClaseCabina")]
        public string ClaseCabina { get; set; } = "ECONOMY"; // ECONOMY, PREMIUM_ECONOMY, BUSINESS

        [Column("MarcaTarifa")]
        public string MarcaTarifa { get; set; } = "Light"; // Light, Plus, Top

        [Column("AsientosDisponibles")]
        public int AsientosDisponibles { get; set; } = 40;

        [Column("TarifaBase")]
        public decimal TarifaBase { get; set; }

        [Column("Impuestos")]
        public decimal Impuestos { get; set; }

        [Column("PrecioTotal")]
        public decimal PrecioTotal { get; set; }

        [Column("Moneda")]
        public string Moneda { get; set; } = "USD";

        [Column("EsReembolsable")]
        public bool EsReembolsable { get; set; } = false;

        [Column("PermiteCambios")]
        public bool PermiteCambios { get; set; } = true;

        [Column("ArticuloPersonalIncluido")]
        public bool ArticuloPersonalIncluido { get; set; } = true;

        [Column("EquipajeManoIncluido")]
        public int EquipajeManoIncluido { get; set; } = 1;

        [Column("EquipajeBodegaIncluido")]
        public int EquipajeBodegaIncluido { get; set; } = 0;

        [Column("PrecioEquipajeAdicional")]
        public decimal PrecioEquipajeAdicional { get; set; } = 25.00m;
    }

    [Table("Asientos")]
    public class Asiento
    {
        [Key]
        [Column("Id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("VueloId")]
        public string VueloId { get; set; } = string.Empty;
        public Vuelo? Vuelo { get; set; }

        [Column("SegmentoId")]
        public string SegmentoId { get; set; } = string.Empty;

        [Column("ClaseCabina")]
        public string ClaseCabina { get; set; } = "ECONOMY";

        [Column("NumeroFila")]
        public int NumeroFila { get; set; }

        [Column("NumeroAsiento")]
        public string NumeroAsiento { get; set; } = string.Empty; // e.g. "12A"

        [Column("EstaDisponible")]
        public bool EstaDisponible { get; set; } = true;

        [Column("Caracteristicas")]
        public string Caracteristicas { get; set; } = "WINDOW"; // Delimited: WINDOW, AISLE, EXTRA_LEGROOM, EMERGENCY_EXIT
    }

    [Table("BloqueosTemporales")]
    public class BloqueoTemporal
    {
        [Key]
        [Column("BloqueoId")]
        public Guid BloqueoId { get; set; } = Guid.NewGuid();

        [Column("OfertaId")]
        public string OfertaId { get; set; } = string.Empty;

        [Column("VueloId")]
        public string VueloId { get; set; } = string.Empty;

        [Column("ItinerarioId")]
        public string ItinerarioId { get; set; } = string.Empty;

        [Column("ClaseCabina")]
        public string ClaseCabina { get; set; } = "ECONOMY";

        [Column("MarcaTarifa")]
        public string MarcaTarifa { get; set; } = "Light";

        [Column("TarifaBaseBloqueada")]
        public decimal TarifaBaseBloqueada { get; set; }

        [Column("ImpuestosBloqueados")]
        public decimal ImpuestosBloqueados { get; set; }

        [Column("TotalBloqueado")]
        public decimal TotalBloqueado { get; set; }

        [Column("Moneda")]
        public string Moneda { get; set; } = "USD";

        [Column("Estado")]
        public string Estado { get; set; } = "HELD"; // HELD, RELEASED, EXPIRED, CONSUMED

        [Column("FechaCreacion")]
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        [Column("FechaExpiracion")]
        public DateTime FechaExpiracion { get; set; } = DateTime.UtcNow.AddMinutes(15);

        [Column("TiempoVidaMinutos")]
        public int TiempoVidaMinutos { get; set; } = 15;

        [Column("Adultos")]
        public int Adultos { get; set; } = 1;

        [Column("Jovenes")]
        public int Jovenes { get; set; } = 0;

        [Column("Ninos")]
        public int Ninos { get; set; } = 0;

        [Column("Bebes")]
        public int Bebes { get; set; } = 0;
    }

    [Table("Reservas")]
    public class Reserva
    {
        [Key]
        [Column("ReservaId")]
        public Guid ReservaId { get; set; } = Guid.NewGuid();

        [Column("Pnr")]
        public string Pnr { get; set; } = string.Empty; // 6 alphanumeric

        [Column("Estado")]
        public string Estado { get; set; } = "CONFIRMED"; // PENDING, PENDING_PAYMENT, TICKET_ISSUING, CONFIRMED, FAILED, CHANGE_PENDING, CANCELLATION_PENDING, CANCELLED

        [Column("TotalBaseGeneral")]
        public decimal TotalBaseGeneral { get; set; }

        [Column("TotalImpuestosGeneral")]
        public decimal TotalImpuestosGeneral { get; set; }

        [Column("MontoTotalGeneral")]
        public decimal MontoTotalGeneral { get; set; }

        [Column("Moneda")]
        public string Moneda { get; set; } = "USD";

        [Column("FechaCreacion")]
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        [Column("FechaActualizacion")]
        public DateTime? FechaActualizacion { get; set; }

        [Column("ReferenciaPago")]
        public string ReferenciaPago { get; set; } = string.Empty;

        [Column("VueloId")]
        public string? VueloId { get; set; }

        [Column("ItinerarioId")]
        public string? ItinerarioId { get; set; }

        [Column("ClaseCabina")]
        public string? ClaseCabina { get; set; }

        [Column("MarcaTarifa")]
        public string? MarcaTarifa { get; set; }

        [Column("OrigenIata")]
        public string OrigenIata { get; set; } = string.Empty;

        [Column("DestinoIata")]
        public string DestinoIata { get; set; } = string.Empty;

        [Column("FechaSalida")]
        public DateTime FechaSalida { get; set; }

        [Column("HistorialCambiosJson")]
        public string? HistorialCambiosJson { get; set; }

        [Column("MotivoCancelacion")]
        public string? MotivoCancelacion { get; set; }

        public List<Pasajero> Pasajeros { get; set; } = new();
        public List<Boleto> Boletos { get; set; } = new();
        public List<PaseAbordar> PasesAbordar { get; set; } = new();
    }

    [Table("Pasajeros")]
    public class Pasajero
    {
        [Key]
        [Column("Id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("ReservaId")]
        public Guid ReservaId { get; set; }
        public Reserva? Reserva { get; set; }

        [Column("TipoPasajero")]
        public string TipoPasajero { get; set; } = "ADULT"; // ADULT, YOUTH, CHILD, INFANT

        [Column("AdultoAsociadoId")]
        public string? AdultoAsociadoId { get; set; }

        [Column("Nombre")]
        public string Nombre { get; set; } = string.Empty;

        [Column("Apellido")]
        public string Apellido { get; set; } = string.Empty;

        [Column("TipoDocumento")]
        public string TipoDocumento { get; set; } = "NATIONAL_ID"; // PASSPORT, NATIONAL_ID

        [Column("NumeroDocumento")]
        public string NumeroDocumento { get; set; } = string.Empty;

        [Column("Nacionalidad")]
        public string Nacionalidad { get; set; } = "EC";

        [Column("FechaCaducidadDocumento")]
        public string? FechaCaducidadDocumento { get; set; }

        [Column("FechaNacimiento")]
        public string FechaNacimiento { get; set; } = string.Empty;

        [Column("Genero")]
        public string Genero { get; set; } = "M"; // M, F, X

        [Column("Correo")]
        public string Correo { get; set; } = string.Empty;

        [Column("Telefono")]
        public string Telefono { get; set; } = string.Empty;

        [Column("NumeroAsientoAsignado")]
        public string? NumeroAsientoAsignado { get; set; }

        [Column("CantidadEquipajeExtra")]
        public int CantidadEquipajeExtra { get; set; } = 0;

        [Column("TieneCheckIn")]
        public bool TieneCheckIn { get; set; } = false;
    }

    [Table("Boletos")]
    public class Boleto
    {
        [Key]
        [Column("BoletoId")]
        public string BoletoId { get; set; } = "TK-" + Guid.NewGuid().ToString("N")[..8].ToUpper();

        [Column("ReservaId")]
        public Guid ReservaId { get; set; }
        public Reserva? Reserva { get; set; }

        [Column("PasajeroId")]
        public string PasajeroId { get; set; } = string.Empty;

        [Column("NumeroBoletoElectronico")]
        public string NumeroBoletoElectronico { get; set; } = "045-" + new Random().Next(100000000, 999999999).ToString();

        [Column("Estado")]
        public string Estado { get; set; } = "ISSUED"; // PENDING, ISSUING, ISSUED, FAILED, VOIDED, REFUNDED

        [Column("FechaEmision")]
        public DateTime FechaEmision { get; set; } = DateTime.UtcNow;

        [Column("SegmentoId")]
        public string SegmentoId { get; set; } = string.Empty;

        [Column("NumeroCupon")]
        public string NumeroCupon { get; set; } = "CP-1";

        [Column("MotivoFallo")]
        public string? MotivoFallo { get; set; }
    }

    [Table("PasesAbordar")]
    public class PaseAbordar
    {
        [Key]
        [Column("Id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("ReservaId")]
        public Guid ReservaId { get; set; }
        public Reserva? Reserva { get; set; }

        [Column("PasajeroId")]
        public string PasajeroId { get; set; } = string.Empty;

        [Column("SegmentoId")]
        public string SegmentoId { get; set; } = string.Empty;

        [Column("Asiento")]
        public string Asiento { get; set; } = string.Empty;

        [Column("GrupoAbordaje")]
        public string GrupoAbordaje { get; set; } = "Grupo 2";

        [Column("PosicionAbordaje")]
        public string PosicionAbordaje { get; set; } = "15";

        [Column("CodigoBarras")]
        public string CodigoBarras { get; set; } = string.Empty;

        [Column("TipoCodigoBarras")]
        public string TipoCodigoBarras { get; set; } = "QR"; // AZTEC, PDF417, QR

        [Column("FechaCreacion")]
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }

    [Table("CotizacionesCancelacion")]
    public class CotizacionCancelacion
    {
        [Key]
        [Column("CotizacionId")]
        public string CotizacionId { get; set; } = "QTE-" + Guid.NewGuid().ToString("N")[..8].ToUpper();

        [Column("ReservaId")]
        public Guid ReservaId { get; set; }

        [Column("EsReembolsable")]
        public bool EsReembolsable { get; set; }

        [Column("MontoReembolso")]
        public decimal MontoReembolso { get; set; }

        [Column("MontoPenalidad")]
        public decimal MontoPenalidad { get; set; }

        [Column("Moneda")]
        public string Moneda { get; set; } = "USD";

        [Column("FechaExpiracion")]
        public DateTime FechaExpiracion { get; set; } = DateTime.UtcNow.AddMinutes(30);
    }

    [Table("OfertasCambioFecha")]
    public class OfertaCambioFecha
    {
        [Key]
        [Column("OfertaCambioId")]
        public string OfertaCambioId { get; set; } = "CHG-" + Guid.NewGuid().ToString("N")[..8].ToUpper();

        [Column("ReservaId")]
        public Guid ReservaId { get; set; }

        [Column("NuevaFechaSalida")]
        public DateTime NuevaFechaSalida { get; set; }

        [Column("DiferenciaTarifa")]
        public decimal DiferenciaTarifa { get; set; }

        [Column("DiferenciaImpuesto")]
        public decimal DiferenciaImpuesto { get; set; }

        [Column("CargoCambio")]
        public decimal CargoCambio { get; set; }

        [Column("TotalPagar")]
        public decimal TotalPagar { get; set; }

        [Column("FechaExpiracion")]
        public DateTime FechaExpiracion { get; set; } = DateTime.UtcNow.AddMinutes(20);
    }

    [Table("SuscripcionesWebhooks")]
    public class SuscripcionWebhook
    {
        [Key]
        [Column("Id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("Url")]
        public string Url { get; set; } = string.Empty;

        [Column("EventosJson")]
        public string EventosJson { get; set; } = "[]";

        [Column("ClaveSecreta")]
        public string ClaveSecreta { get; set; } = string.Empty;

        [Column("FechaCreacion")]
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }

    [Table("RegistrosIdempotencia")]
    public class RegistroIdempotencia
    {
        [Key]
        [Column("Clave")]
        public string Clave { get; set; } = string.Empty;

        [Column("CodigoEstado")]
        public int CodigoEstado { get; set; }

        [Column("CuerpoRespuesta")]
        public string CuerpoRespuesta { get; set; } = string.Empty;

        [Column("FechaCreacion")]
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }
}
