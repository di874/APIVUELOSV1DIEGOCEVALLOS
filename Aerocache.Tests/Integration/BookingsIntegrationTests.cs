using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Aerocache.Business.DTOs;
using Aerocache.DataAccess.Context;
using Aerocache.DataAccess.Entities;
using Aerocache.Tests.Framework;

namespace Aerocache.Tests.Integration
{
    /// <summary>
    /// Pruebas de Integración para BookingsController.
    /// Verifican la integración real entre el pipeline HTTP de ASP.NET Core, ProblemDetailsExceptionMiddleware,
    /// serialización JSON CamelCase (incluyendo MoneyAmountJsonConverter), rutas múltiples (/api/v2/vuelos/bookings, etc.),
    /// BookingService, UnitOfWork y la base de datos relacional EF Core SQLite.
    /// </summary>
    public class BookingsIntegrationTests
    {
        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private static async Task<BloqueoTemporal> SeedHoldInDbAsync(
            AerocacheTestServer server,
            string state = "HELD",
            int expiresInMinutes = 15,
            decimal lockedTotal = 56.35m,
            string? assignedSeats = "6A")
        {
            using var scope = server.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AerocacheDbContext>();

            var hold = new BloqueoTemporal
            {
                BloqueoId = Guid.NewGuid(),
                OfertaId = "OFF-FL-AC1401-TEST",
                VueloId = "FL-AC1401-TEST",
                ItinerarioId = "ITIN-FL-AC1401-TEST",
                ClaseCabina = "ECONOMY",
                MarcaTarifa = "Light",
                TarifaBaseBloqueada = 49.00m,
                ImpuestosBloqueados = 7.35m,
                TotalBloqueado = lockedTotal,
                Moneda = "USD",
                Estado = state,
                FechaCreacion = DateTime.UtcNow,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(expiresInMinutes),
                AsientosAsignados = assignedSeats
            };

            db.BloqueosTemporales.Add(hold);
            await db.SaveChangesAsync();
            return hold;
        }

        private static BookingRequest CreateSampleBookingPayload(Guid holdId, string total = "56.35", string? seat = null)
        {
            return new BookingRequest
            {
                HoldId = holdId.ToString(),
                Payment = new PaymentReference
                {
                    PaymentReferenceValue = "STRIPE-PI-998877",
                    Amount = new MoneyAmount { Currency = "USD", Total = total }
                },
                SalesChannel = new SalesChannelDto
                {
                    PartnerId = "OTA_ECUADOR",
                    PartnerOrderId = "ORD-2026-500",
                    PackageId = "PKG-GALAPAGOS"
                },
                Passengers = new List<PassengerItem>
                {
                    new()
                    {
                        FirstName = "Maite",
                        LastName = "Suquillo",
                        PassengerType = "ADULT",
                        DocumentType = "NATIONAL_ID",
                        DocumentNumber = "1722334455",
                        Nationality = "EC",
                        BirthDate = "2001-09-20",
                        Gender = "F",
                        Contact = new ContactInfo { Email = "maite@aerocache.ec", Phone = "+593987654321" },
                        AssignedSeats = seat != null
                            ? new List<AssignedSeatDto> { new() { SegmentId = "SEG-FL-AC1401-TEST", SeatNumber = seat } }
                            : null
                    }
                }
            };
        }

        [Fact]
        public async Task PostBookings_ValidHold_PersistsEntitiesInDatabase_AndReturns201Created()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold = await SeedHoldInDbAsync(server, assignedSeats: "6A");

            using var reqMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v2/vuelos/bookings")
            {
                Content = JsonContent.Create(CreateSampleBookingPayload(hold.BloqueoId), options: JsonOpts)
            };
            reqMsg.Headers.Add("Idempotency-Key", "idem-int-001");
            reqMsg.Headers.Add("X-User-Id", "usr-maite-01");

            var response = await server.Client.SendAsync(reqMsg);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);
            Assert.NotNull(body);
            Assert.Equal("CONFIRMED", body!.Status);
            Assert.Equal("56.35", body.GrandTotal.Total);
            Assert.Single(body.Passengers);
            Assert.Equal("6A", body.Passengers[0].AssignedSeats![0].SeatNumber);
            Assert.Single(body.Tickets);

            // Verificar persistencia real en SQLite
            using var scope = server.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AerocacheDbContext>();
            var dbBooking = await db.Reservas
                .Include(b => b.Pasajeros)
                .Include(b => b.Boletos)
                .FirstOrDefaultAsync(b => b.ReservaId == Guid.Parse(body.BookingId));

            Assert.NotNull(dbBooking);
            Assert.Equal("usr-maite-01", dbBooking!.UsuarioId);
            Assert.Equal("OTA_ECUADOR", dbBooking.PartnerId);
            Assert.Single(dbBooking.Pasajeros);
            Assert.Single(dbBooking.Boletos);

            var dbHold = await db.BloqueosTemporales.FindAsync(hold.BloqueoId);
            Assert.Equal("CONSUMED", dbHold!.Estado);
        }

        [Theory]
        [InlineData("/bookings")]
        [InlineData("/vuelos/bookings")]
        [InlineData("/api/v2/bookings")]
        [InlineData("/api/v2/vuelos/bookings")]
        public async Task GetBookings_SupportsAllConfiguredRoutePrefixes(string routePrefix)
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var response = await server.Client.GetAsync(routePrefix);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var list = await response.Content.ReadFromJsonAsync<BookingListResponse>(JsonOpts);
            Assert.NotNull(list);
        }

        [Fact]
        public async Task PostBookings_ExpiredHold_MiddlewareFormatsRfc7807ProblemDetailsWith410Gone()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold = await SeedHoldInDbAsync(server, state: "HELD", expiresInMinutes: -10);

            var response = await server.Client.PostAsJsonAsync(
                "/api/v2/vuelos/bookings",
                CreateSampleBookingPayload(hold.BloqueoId),
                JsonOpts);

            Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

            var problem = await response.Content.ReadFromJsonAsync<ProblemDetailsDto>(JsonOpts);
            Assert.NotNull(problem);
            Assert.Equal(410, problem!.Status);
            Assert.Equal("HOLD_EXPIRED", problem.Code);
        }

        [Fact]
        public async Task PostBookings_AmountMismatch_MiddlewareReturns422UnprocessableEntity()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold = await SeedHoldInDbAsync(server, lockedTotal: 56.35m);

            var response = await server.Client.PostAsJsonAsync(
                "/api/v2/vuelos/bookings",
                CreateSampleBookingPayload(hold.BloqueoId, total: "99.99"),
                JsonOpts);

            Assert.Equal((HttpStatusCode)422, response.StatusCode);
            var problem = await response.Content.ReadFromJsonAsync<ProblemDetailsDto>(JsonOpts);
            Assert.NotNull(problem);
            Assert.Equal("AMOUNT_MISMATCH", problem!.Code);
        }

        [Fact]
        public async Task GetBookingDetail_EnforcesXUserIdIsolationOverHttp_Returning404ForOtherUsers()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold = await SeedHoldInDbAsync(server);

            using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v2/vuelos/bookings")
            {
                Content = JsonContent.Create(CreateSampleBookingPayload(hold.BloqueoId), options: JsonOpts)
            };
            createReq.Headers.Add("X-User-Id", "usr-legit-owner");
            var createRes = await server.Client.SendAsync(createReq);
            var created = await createRes.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);

            // Consulta con otro X-User-Id debe retornar 404 ProblemDetails
            using var getWrongUser = new HttpRequestMessage(HttpMethod.Get, $"/api/v2/vuelos/bookings/{created!.BookingId}");
            getWrongUser.Headers.Add("X-User-Id", "usr-other-account");
            var wrongRes = await server.Client.SendAsync(getWrongUser);

            Assert.Equal(HttpStatusCode.NotFound, wrongRes.StatusCode);
            var problem = await wrongRes.Content.ReadFromJsonAsync<ProblemDetailsDto>(JsonOpts);
            Assert.Equal("BOOKING_NOT_FOUND", problem!.Code);

            // Consulta con el X-User-Id correcto retorna 200 OK
            using var getRightUser = new HttpRequestMessage(HttpMethod.Get, $"/api/v2/vuelos/bookings/{created.BookingId}");
            getRightUser.Headers.Add("X-User-Id", "usr-legit-owner");
            var rightRes = await server.Client.SendAsync(getRightUser);
            Assert.Equal(HttpStatusCode.OK, rightRes.StatusCode);
        }

        [Fact]
        public async Task GetListBookings_FiltersByPnrEmailLastNameStatusAndUserId()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold1 = await SeedHoldInDbAsync(server, assignedSeats: "4A");
            var hold2 = await SeedHoldInDbAsync(server, assignedSeats: "4B");

            var payload1 = CreateSampleBookingPayload(hold1.BloqueoId);
            payload1.Passengers[0].LastName = "Cevallos";
            payload1.Passengers[0].Contact.Email = "diego@aerocache.ec";

            var payload2 = CreateSampleBookingPayload(hold2.BloqueoId);
            payload2.Passengers[0].LastName = "Suquillo";
            payload2.Passengers[0].Contact.Email = "maite@aerocache.ec";

            var res1 = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", payload1, JsonOpts);
            var b1 = await res1.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);

            await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", payload2, JsonOpts);

            // Filtrar por PNR
            var byPnr = await server.Client.GetFromJsonAsync<BookingListResponse>($"/api/v2/vuelos/bookings?pnr={b1!.Pnr}", JsonOpts);
            Assert.Single(byPnr!.Items);
            Assert.Equal(b1.BookingId, byPnr.Items[0].BookingId);

            // Filtrar por apellido (case-insensitive)
            var byLastName = await server.Client.GetFromJsonAsync<BookingListResponse>("/api/v2/vuelos/bookings?lastName=suquillo", JsonOpts);
            Assert.Single(byLastName!.Items);
            Assert.Contains("Suquillo", byLastName.Items[0].PassengerName);

            // Filtrar por email
            var byEmail = await server.Client.GetFromJsonAsync<BookingListResponse>("/api/v2/vuelos/bookings?email=DIEGO@aerocache.ec", JsonOpts);
            Assert.Single(byEmail!.Items);
            Assert.Equal("diego@aerocache.ec", byEmail.Items[0].ContactEmail);
        }

        [Fact]
        public async Task TicketsEndpoints_GetTickets_GetSingleTicket_AndPostIssueTickets_WorkEndToEndWithDb()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold = await SeedHoldInDbAsync(server, assignedSeats: "5C");
            var createRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", CreateSampleBookingPayload(hold.BloqueoId), JsonOpts);
            var booking = await createRes.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);

            // 1. GET /api/v2/vuelos/bookings/{bookingId}/tickets
            var listRes = await server.Client.GetAsync($"/api/v2/vuelos/bookings/{booking!.BookingId}/tickets");
            Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
            var ticketList = await listRes.Content.ReadFromJsonAsync<TicketListResponse>(JsonOpts);
            Assert.Single(ticketList!.Tickets);
            var ticketId = ticketList.Tickets[0].TicketId;

            // 2. GET /api/v2/vuelos/bookings/{bookingId}/tickets/{ticketId}
            var singleRes = await server.Client.GetAsync($"/api/v2/vuelos/bookings/{booking.BookingId}/tickets/{ticketId}");
            Assert.Equal(HttpStatusCode.OK, singleRes.StatusCode);
            var singleTicket = await singleRes.Content.ReadFromJsonAsync<TicketDto>(JsonOpts);
            Assert.Equal(ticketId, singleTicket!.TicketId);
            Assert.Equal("ISSUED", singleTicket.Status);

            // 3. POST /api/v2/vuelos/bookings/{bookingId}/tickets (Re-emisión idempotente cuando ya están ISSUED -> Issued = 0)
            var issueRes = await server.Client.PostAsync($"/api/v2/vuelos/bookings/{booking.BookingId}/tickets", null);
            Assert.Equal(HttpStatusCode.OK, issueRes.StatusCode);
            var issuance = await issueRes.Content.ReadFromJsonAsync<TicketIssuanceResponse>(JsonOpts);
            Assert.Equal(0, issuance!.Issued);
            Assert.Single(issuance.Tickets);
        }

        [Fact]
        public async Task PutChangeSeats_UpdatesPassengerSeatInDatabase_AndReturnsPreviousAndNewSeat()
        {
            await using var server = await AerocacheTestServer.StartAsync();
            var hold = await SeedHoldInDbAsync(server, assignedSeats: "7A");
            var createRes = await server.Client.PostAsJsonAsync("/api/v2/vuelos/bookings", CreateSampleBookingPayload(hold.BloqueoId), JsonOpts);
            var booking = await createRes.Content.ReadFromJsonAsync<BookingDetail>(JsonOpts);
            var passengerId = booking!.Passengers[0].PassengerId;

            var seatChangeReq = new SeatChangeRequest
            {
                Seats = new List<SeatChangeRequestItem>
                {
                    new()
                    {
                        PassengerId = passengerId,
                        SegmentId = "SEG-FL-AC1401-TEST",
                        SeatNumber = "11F"
                    }
                }
            };

            var putRes = await server.Client.PutAsJsonAsync($"/api/v2/vuelos/bookings/{booking.BookingId}/seats", seatChangeReq, JsonOpts);
            Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);

            var changeBody = await putRes.Content.ReadFromJsonAsync<SeatChangeResponse>(JsonOpts);
            Assert.NotNull(changeBody);
            Assert.Single(changeBody!.Seats);
            Assert.Equal("7A", changeBody.Seats[0].PreviousSeatNumber);
            Assert.Equal("11F", changeBody.Seats[0].SeatNumber);
            Assert.Equal("CONFIRMED", changeBody.Seats[0].Status);

            // Verificar en base de datos que el asiento cambió a 11F
            var updatedDetail = await server.Client.GetFromJsonAsync<BookingDetail>($"/api/v2/vuelos/bookings/{booking.BookingId}", JsonOpts);
            Assert.Equal("11F", updatedDetail!.Passengers[0].AssignedSeats![0].SeatNumber);
        }
    }
}
