using System;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Threading.Tasks;

namespace Aerocache.Business.Interfaces
{
    [ServiceContract(Namespace = "http://aerocache.ec/services/postsale", Name = "PostSaleServiceSoap")]
    public interface IPostSaleSoapService
    {
        [OperationContract(Action = "http://aerocache.ec/services/postsale/QuoteCancellation")]
        Task<QuoteCancellationSoapResponse> QuoteCancellationAsync(QuoteCancellationSoapRequest request);

        [OperationContract(Action = "http://aerocache.ec/services/postsale/CancelBooking")]
        Task<CancelBookingSoapResponse> CancelBookingAsync(CancelBookingSoapRequest request);

        [OperationContract(Action = "http://aerocache.ec/services/postsale/QuoteReschedule")]
        Task<QuoteRescheduleSoapResponse> QuoteRescheduleAsync(QuoteRescheduleSoapRequest request);

        [OperationContract(Action = "http://aerocache.ec/services/postsale/RescheduleBooking")]
        Task<RescheduleBookingSoapResponse> RescheduleBookingAsync(RescheduleBookingSoapRequest request);

        [OperationContract(Action = "http://aerocache.ec/services/postsale/AddBaggage")]
        Task<AddBaggageSoapResponse> AddBaggageAsync(AddBaggageSoapRequest request);

        [OperationContract(Action = "http://aerocache.ec/services/postsale/GetPostSaleSummary")]
        Task<PostSaleSummarySoapResponse> GetPostSaleSummaryAsync(PostSaleSummarySoapRequest request);
    }

    // ==========================================
    // DATA CONTRACTS: CANCELLATIONS
    // ==========================================
    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class QuoteCancellationSoapRequest
    {
        [DataMember(Order = 1)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 2)]
        public string? Reason { get; set; }
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class QuoteCancellationSoapResponse
    {
        [DataMember(Order = 1)]
        public bool Success { get; set; }

        [DataMember(Order = 2)]
        public string QuoteId { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 4)]
        public bool IsRefundable { get; set; }

        [DataMember(Order = 5)]
        public decimal RefundAmount { get; set; }

        [DataMember(Order = 6)]
        public decimal PenaltyAmount { get; set; }

        [DataMember(Order = 7)]
        public string Currency { get; set; } = "USD";

        [DataMember(Order = 8)]
        public DateTime ExpiresAt { get; set; }

        [DataMember(Order = 9)]
        public string Message { get; set; } = string.Empty;
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class CancelBookingSoapRequest
    {
        [DataMember(Order = 1)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 2)]
        public string QuoteId { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string? Reason { get; set; }
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class CancelBookingSoapResponse
    {
        [DataMember(Order = 1)]
        public bool Success { get; set; }

        [DataMember(Order = 2)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string Status { get; set; } = "CANCELLED";

        [DataMember(Order = 4)]
        public decimal RefundedAmount { get; set; }

        [DataMember(Order = 5)]
        public string Message { get; set; } = string.Empty;
    }

    // ==========================================
    // DATA CONTRACTS: RESCHEDULE (CAMBIO DE FECHA)
    // ==========================================
    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class QuoteRescheduleSoapRequest
    {
        [DataMember(Order = 1)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 2)]
        public string TargetFlightNumber { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string NewDepartureDate { get; set; } = string.Empty;
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class QuoteRescheduleSoapResponse
    {
        [DataMember(Order = 1)]
        public bool Success { get; set; }

        [DataMember(Order = 2)]
        public string ChangeOfferId { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 4)]
        public string TargetFlightNumber { get; set; } = string.Empty;

        [DataMember(Order = 5)]
        public decimal FareDifference { get; set; }

        [DataMember(Order = 6)]
        public decimal ChangeFee { get; set; }

        [DataMember(Order = 7)]
        public decimal TotalToPay { get; set; }

        [DataMember(Order = 8)]
        public string Currency { get; set; } = "USD";

        [DataMember(Order = 9)]
        public DateTime ExpiresAt { get; set; }

        [DataMember(Order = 10)]
        public string Message { get; set; } = string.Empty;
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class RescheduleBookingSoapRequest
    {
        [DataMember(Order = 1)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 2)]
        public string ChangeOfferId { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string TargetFlightNumber { get; set; } = string.Empty;

        [DataMember(Order = 4)]
        public string? NewSeatNumber { get; set; }
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class RescheduleBookingSoapResponse
    {
        [DataMember(Order = 1)]
        public bool Success { get; set; }

        [DataMember(Order = 2)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string NewFlightNumber { get; set; } = string.Empty;

        [DataMember(Order = 4)]
        public string NewDepartureDate { get; set; } = string.Empty;

        [DataMember(Order = 5)]
        public string NewSeatNumber { get; set; } = string.Empty;

        [DataMember(Order = 6)]
        public string Message { get; set; } = string.Empty;
    }

    // ==========================================
    // DATA CONTRACTS: BAGGAGE (EQUIPAJE / MALETAS)
    // ==========================================
    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class AddBaggageSoapRequest
    {
        [DataMember(Order = 1)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 2)]
        public string? PassengerDocument { get; set; }

        [DataMember(Order = 3)]
        public int Quantity { get; set; } = 1;
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class AddBaggageSoapResponse
    {
        [DataMember(Order = 1)]
        public bool Success { get; set; }

        [DataMember(Order = 2)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string PassengerName { get; set; } = string.Empty;

        [DataMember(Order = 4)]
        public int TotalBaggage { get; set; }

        [DataMember(Order = 5)]
        public decimal AmountCharged { get; set; }

        [DataMember(Order = 6)]
        public string Currency { get; set; } = "USD";

        [DataMember(Order = 7)]
        public string Message { get; set; } = string.Empty;
    }

    // ==========================================
    // DATA CONTRACTS: POST-SALE SUMMARY (HISTORIAL)
    // ==========================================
    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class PostSaleSummarySoapRequest
    {
        [DataMember(Order = 1)]
        public string Pnr { get; set; } = string.Empty;
    }

    [DataContract(Namespace = "http://aerocache.ec/services/postsale")]
    public class PostSaleSummarySoapResponse
    {
        [DataMember(Order = 1)]
        public bool Success { get; set; }

        [DataMember(Order = 2)]
        public string Pnr { get; set; } = string.Empty;

        [DataMember(Order = 3)]
        public string Status { get; set; } = string.Empty;

        [DataMember(Order = 4)]
        public string FlightNumber { get; set; } = string.Empty;

        [DataMember(Order = 5)]
        public string Route { get; set; } = string.Empty;

        [DataMember(Order = 6)]
        public string DepartureDate { get; set; } = string.Empty;

        [DataMember(Order = 7)]
        public decimal TotalAmount { get; set; }

        [DataMember(Order = 8)]
        public string Currency { get; set; } = "USD";

        [DataMember(Order = 9)]
        public string FareBrand { get; set; } = string.Empty;

        [DataMember(Order = 10)]
        public int PassengersCount { get; set; }

        [DataMember(Order = 11)]
        public int TotalBaggageCount { get; set; }

        [DataMember(Order = 12)]
        public bool CanCancel { get; set; }

        [DataMember(Order = 13)]
        public bool CanReschedule { get; set; }

        [DataMember(Order = 14)]
        public bool CanAddBaggage { get; set; }

        [DataMember(Order = 15)]
        public string ChangeHistory { get; set; } = string.Empty;

        [DataMember(Order = 16)]
        public string Message { get; set; } = string.Empty;
    }
}
