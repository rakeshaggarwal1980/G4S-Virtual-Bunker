using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace TeamCollaborationApp.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task RoomsUpdated(bool flag)
            => await Clients.Others.SendAsync("RoomsUpdated", flag);
    }
}
