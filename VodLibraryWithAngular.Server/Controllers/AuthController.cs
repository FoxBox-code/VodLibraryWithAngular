using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<IdentityUser> _userManager;

        private readonly SignInManager<IdentityUser> _signInManager;

        public AuthController(UserManager<IdentityUser> userManager, SignInManager<IdentityUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDTO model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid model", errors = ModelState.Values.SelectMany(e => e.Errors).Select(e => e.ErrorMessage) });
            }

            if (model.Password != model.ConfirmPassword)
            {
                return Unauthorized("Passwords don't match");
            }

            IdentityUser user = new IdentityUser
            {
                UserName = model.UserName,
                Email = model.Email,

            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                return Ok(model);

            }
            else
            {
                return BadRequest(new { message = "Registration failed", errors = result.Errors.Select(e => e.Description) });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> LogIn([FromBody] LogInDTO model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid login model", errors = ModelState.Values.SelectMany(e => e.Errors).Select(e => e.ErrorMessage) });
            }

            var user = await _userManager.FindByEmailAsync(model.Email);

            if (user == null)
            {
                return Unauthorized("Invalid email or password");
            }

            var result = await _signInManager.PasswordSignInAsync(user.UserName, model.Password, model.RememberMe, false);



            if (result.Succeeded)
            {
                var token = GenerateJwtToken(user);
                return Ok(new { token });
            }
            else
            {
                return Unauthorized("Invalid log in details");
            }

        }

        private string GenerateJwtToken(IdentityUser user)
        {
            JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();

            byte[] key = Encoding.ASCII.GetBytes("X7fL92bWk6TK7hkXZmK6u4JVLtLRcpXIkx4yqXIESGiUKxxTjghtCWyoglJ1U0G3");


            SecurityTokenDescriptor securityTokenDescriptor = new SecurityTokenDescriptor()
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, user.UserName),
                    new Claim(ClaimTypes.NameIdentifier, user.Id),

                }),
                Expires = DateTime.UtcNow.AddHours(1),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = handler.CreateToken(securityTokenDescriptor);

            return handler.WriteToken(token);

        }



    }
}
