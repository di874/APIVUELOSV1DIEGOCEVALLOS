using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;
using Aerocache.Business.DTOs;
using Aerocache.Tests.Framework;

namespace Aerocache.Tests.E2E
{
    /// <summary>
    /// Pruebas End-to-End (E2E) del flujo completo de vuelos en Aerocache centradas en BookingsController.
    /// Ejecutan recorridos de usuario reales cruzando múltiples controladores HTTP:
    /// SearchController -> OffersController (SeatMap & Hold) -> BookingsController (Booking, Tickets, SeatChange).
    /// </summary>
    public class BookingsE2ETests
    {
        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        [Fact]
        public async Task E2E_CompletePassengerJourney_Search_SeatMap_Hold_Book_VerifyHoldConsumed_ChangeSeat_AndVerifyTicket()
        {
            await using var server = await AerocacheTestServer.StartAsync(seedSampleFlightData: true);
            var departureDate = DateTime.UtcNow.Date.AddDays(5).ToString("yyyy-MM-dd");

            // PASO 1: Búsqueda de vuelo UIO -> GYE (POST /api/v2/vuelos/search)
            var searchRequest = new SearchRequest
            {
                Itineraries = new List<ItinerarySearchItem>
                {
                    new() { Origin = "UIO", Destination = "GYE", DepartureDate = departureDate }
                },
                Passengers = new PassengerBreakdown { Adults = 1 }
            };

            var searchHttpRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/search", searchRequest, JsonOpts);
            Assert.Equal(HttpStatusCode.OK, searchHttpRes.StatusCode);
            var searchResult = await searchHttpRes.Content.ReadFromJsonAsync<SearchResponse>(JsonOpts);
            Assert.NotNull(searchResult);
            Assert.NotEmpty(searchResult!.Offers);

            var selectedOffer = searchResult.Offers.First();
            var selectedItinerary = selectedOffer.Itineraries.First();
            var selectedSegment = selectedItinerary.Segments.First();

            // PASO 2: Consultar mapa de asientos de la oferta (GET /api/v2/vuelos/offers/{offerId}/seatmap)
            var seatMapHttpRes = await server.Client.GetAsync($"/api/v2/vuelos/offers/{selectedOffer.OfferId}/seatmap?segmentId={selectedSegment.SegmentId}");
            Assert.Equal(HttpStatusCode.OK, seatMapHttpRes.StatusCode);
            var seatMap = await seatMapHttpRes.Content.ReadFromJsonAsync<SeatMapResponse>(JsonOpts);
            Assert.NotNull(seatMap);
            Assert.NotEmpty(seatMap!.Cabins);

            // PASO 3: Crear Hold congelando tarifa y asiento 6A (POST /api/v2/vuelos/offers/hold)
            var holdRequest = new HoldRequest
            {
                OfferId = selectedOffer.OfferId,
                TtlMinutes = 15,
                PassengersBreakdown = new PassengerBreakdown { Adults = 1 },
                ItinerarySelections = new List<ItinerarySelectionDto>
                {
                    new()
                    {
                        ItineraryId = selectedItinerary.ItineraryId,
                        CabinClass = "ECONOMY",
                        FareBrand = "Light"
                    }
                },
                AssignedSeats = new List<AssignedSeatDto>
                {
                    new() { SegmentId = selectedSegment.SegmentId, SeatNumber = "6A" }
                }
            };

            var holdHttpRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/offers/hold", holdRequest, JsonOpts);
            Assert.Equal(HttpStatusCode.Created, holdHttpRes.StatusCode);
            var holdResult = await holdHttpRes.Content.ReadFromJsonAsync<HoldResponse>(JsonOpts);
            Assert.NotNull(holdResult);
            Assert.Equal("HELD", holdResult!.Status);

            // PASO 4: Confirmar Reserva y Emisión de Boleto (POST /api/v2/vuelos/bookings)
            var bookingRequest = new BookingRequest
            {
                HoldId = holdResult.HoldId,
                Payment = new PaymentReference
                {
                    PaymentReferenceValue = "PAY-E2E-ECU-9001",
                    Amount = new MoneyAmount { Currency = "USD", Total = holdResult.LockedPrice.Total }
                },
                SalesChannel = new SalesChannelDto
                {
                    PartnerId = "AEROCACHE_WEB",
                    PartnerOrderId = "WEB-ORD-1001"
                },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Carlos",
                        LastName = "Villacis",
                        PassengerType = "ADULT",
                        DocumentType = "NATIONAL_ID",
                        DocumentNumber = "1719988776",
                        Nationality = "EC",
                        BirthDate = "1995-03-10",
                        Gender = "M",
                        Contact = new ContactInfo { Email = "carlos.villacis@epn.edu.ec", Phone = "+593990011223" }
                    }
                }
            };

            using var createBookingMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v2/vuelos/bookings")
            {
                Content = JsonContent.Create(bookingRequest, options: JsonOpts)
            };
            createBookingMsg.Headers.Add("Idempotency-Key", "e2e-booking-idem-1");
            createBookingMsg.Headers.Add("X-User-Id", "usr-carlos-e2e");

            var bookingHttpRes = await server.Client.SendAsync(createBookingMsg);
            Assert.Equal(HttpStatusCode.Created, bookingHttpRes.StatusCode);
            var createdBooking = await bookingHttpRes.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);
            Assert.NotNull(createdBooking);
            Assert.Equal("CONFIRMED", createdBooking!.Status);
            Assert.Equal("6A", createdBooking.Passengers[0].AssignedSeats![0].SeatNumber);
            Assert.Single(createdBooking.Tickets);

            // PASO 5: Verificar que el Hold pasó a estado CONSUMED (GET /api/v2/vuelos/offers/hold/{holdId})
            var holdStatusRes = await server.Client.GetFromJsonAsync<HoldStatusResponse>($"/api/v2/vuelos/offers/hold/{holdResult.HoldId}", JsonOpts);
            Assert.Equal("CONSUMED", holdStatusRes!.Status);

            // PASO 6: Cambiar asiento del pasajero de 6A a 9F (PUT /api/v2/vuelos/bookings/{bookingId}/seats)
            var seatChangeReq = new SeatChangeRequest
            {
                Seats = new List<SeatChangeRequestItem>
                {
                    new()
                    {
                        PassengerId = createdBooking.Passengers[0].PassengerId,
                        SegmentId = selectedSegment.SegmentId,
                        SeatNumber = "9F"
                    }
                }
            };
            var seatChangeRes = await server.Client.PutAsJsonAsync($"/api/v2/vuelos/bookings/{createdBooking.BookingId}/seats", seatChangeReq, JsonOpts);
            Assert.Equal(HttpStatusCode.OK, seatChangeRes.StatusCode);
            var seatChangeBody = await seatChangeRes.Content.ReadFromJsonAsync<SeatChangeResponse>(JsonOpts);
            Assert.Equal("6A", seatChangeBody!.Seats[0].PreviousSeatNumber);
            Assert.Equal("9F", seatChangeBody.Seats[0].SeatNumber);

            // PASO 7: Consultar reserva por PNR en el listado (GET /api/v2/vuelos/bookings?pnr={pnr}) y verificar detalle actualizado
            var listByPnr = await server.Client.GetFromJsonAsync<BookingListResponse>($"/api/v2/vuelos/bookings?pnr={createdBooking.Pnr}", JsonOpts);
            Assert.Single(listByPnr!.Items);
            Assert.Equal(createdBooking.BookingId, listByPnr.Items[0].BookingId);

            using var detailMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v2/vuelos/bookings/{createdBooking.BookingId}");
            detailMsg.Headers.Add("X-User-Id", "usr-carlos-e2e");
            var finalDetailRes = await server.Client.SendAsync(detailMsg);
            var finalDetail = await finalDetailRes.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);
            Assert.Equal("9F", finalDetail!.Passengers[0].AssignedSeats![0].SeatNumber);
        }

        [Fact]
        public async Task E2E_PreventDoubleBookingFromSameHold_SecondAttemptReturns409Conflict()
        {
            await using var server = await AerocacheTestServer.StartAsync(seedSampleFlightData: true);

            // 1. Crear Hold
            var holdReq = new HoldRequest
            {
                OfferId = "OFF-FL-AC1401-TEST",
                TtlMinutes = 15,
                PassengersBreakdown = new PassengerBreakdown { Adults = 1 },
                ItinerarySelections = new List<ItinerarySelectionDto>
                {
                    new() { ItineraryId = "ITIN-FL-AC1401-TEST", CabinClass = "ECONOMY", FareBrand = "Light" }
                }
            };
            var holdRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/offers/hold", holdReq, JsonOpts);
            var hold = await holdRes.Content.ReadFromJsonAsync<HoldResponse>(JsonOpts);

            var bookingReq = new BookingRequest
            {
                HoldId = hold!.HoldId,
                Payment = new PaymentReference
                {
                    PaymentReferenceValue = "PAY-ONCE-001",
                    Amount = new MoneyAmount { Currency = "USD", Total = hold.LockedPrice.Total }
                },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Elena",
                        LastName = "Mora",
                        DocumentNumber = "1700112233",
                        Nationality = "EC",
                        BirthDate = "1992-11-02",
                        Contact = new ContactInfo { Email = "elena@aerocache.ec", Phone = "099111222" }
                    }
                }
            };

            // 2. Primera reserva con el Hold -> 201 Created
            var firstBookingRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", bookingReq, JsonOpts);
            Assert.Equal(HttpStatusCode.Created, firstBookingRes.StatusCode);

            // 3. Segunda reserva intentando reutilizar el mismo Hold -> 409 Conflict (ALREADY_CANCELLED)
            var secondBookingRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", bookingReq, JsonOpts);
            Assert.Equal(HttpStatusCode.Conflict, secondBookingRes.StatusCode);
            var problem = await secondBookingRes.Content.ReadFromJsonAsync<ProblemDetailsDto>(JsonOpts);
            Assert.Equal("ALREADY_CANCELLED", problem!.Code);
        }

        [Fact]
        public async Task E2E_SeatContentionBetweenTwoPassengers_SecondBookingForSameSeatReturns409SeatTaken()
        {
            await using var server = await AerocacheTestServer.StartAsync(seedSampleFlightData: true);

            // Pasajero 1 y Pasajero 2 crean Holds independientes sin asiento preasignado
            var holdReq = new HoldRequest
            {
                OfferId = "OFF-FL-AC1401-TEST",
                TtlMinutes = 15,
                PassengersBreakdown = new PassengerBreakdown { Adults = 1 }
            };

            var hold1 = await (await server.Client.PostAsJsonAsync("/api/v2/vuelos/offers/hold", holdReq, JsonOpts))
                .Content.ReadFromJsonAsync<HoldResponse>(JsonOpts);
            var hold2 = await (await server.Client.PostAsJsonAsync("/api/v2/vuelos/offers/hold", holdReq, JsonOpts))
                .Content.ReadFromJsonAsync<HoldResponse>(JsonOpts);

            BookingRequest CreateReqForHold(HoldResponse h, string email, string seat) => new()
            {
                HoldId = h.HoldId,
                Payment = new PaymentReference
                {
                    PaymentReferenceValue = "PAY-" + Guid.NewGuid().ToString("N")[..6],
                    Amount = new MoneyAmount { Currency = "USD", Total = h.LockedPrice.Total }
                },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Pax",
                        LastName = "Test",
                        DocumentNumber = "1755667788",
                        Nationality = "EC",
                        BirthDate = "1990-01-01",
                        Contact = new ContactInfo { Email = email, Phone = "099000111" },
                        AssignedSeats = new List<AssignedSeatDto> { new() { SegmentId = "SEG-FL-AC1401-TEST", SeatNumber = seat } }
                    }
                }
            };

            // Pasajero 1 reserva el asiento 8A -> 201 Created
            var res1 = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", CreateReqForHold(hold1!, "pax1@epn.ec", "8A"), JsonOpts);
            Assert.Equal(HttpStatusCode.Created, res1.StatusCode);

            // Pasajero 2 intenta reservar el mismo asiento 8A en el mismo vuelo -> 409 Conflict (SEAT_TAKEN)
            var res2 = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", CreateReqForHold(hold2!, "pax2@epn.ec", "8A"), JsonOpts);
            Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);
            var problem = await res2.Content.ReadFromJsonAsync<ProblemDetailsDto>(JsonOpts);
            Assert.Equal("SEAT_TAKEN", problem!.Code);
        }
    }
}
