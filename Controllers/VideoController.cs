using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using TeamCollaborationApp.Abstractions;

namespace TeamCollaborationApp.Controllers
{
    [
        ApiController,
        Route("api/video")
    ]
    public class VideoController : ControllerBase
    {
        readonly IVideoService _videoService;

        public VideoController(IVideoService videoService)
            => _videoService = videoService;

        [HttpGet("token/{identity}")]
        public IActionResult GetToken(string identity)
            => new JsonResult(new { token = _videoService.GetTwilioJwt(identity ?? User.Identity.Name) });
        
        [HttpGet("rooms")]
        public async Task<IActionResult> GetRooms()
            => new JsonResult(await _videoService.GetAllRoomsAsync());
    }
}
