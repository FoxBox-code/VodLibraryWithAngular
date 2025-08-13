using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using NuGet.Protocol;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using VodLibraryWithAngular.Server.Data;
using VodLibraryWithAngular.Server.Interfaces;
using VodLibraryWithAngular.Server.Models;

namespace VodLibraryWithAngular.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ILogger<AuthController> _logger;
        private readonly IFileNameSanitizer _fileNameSanitizer;

        public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, IWebHostEnvironment webHostEnvironment, ILogger<AuthController> logger, IFileNameSanitizer fileNameSanitizer)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
            _fileNameSanitizer = fileNameSanitizer;

        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterDTO model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid model", errors = ModelState.Values.SelectMany(e => e.Errors).Select(e => e.ErrorMessage) });
            }

            if (model.Password != model.ConfirmPassword)
            {
                return Unauthorized("Passwords don't match");
            }

            ApplicationUser user = new ApplicationUser
            {
                UserName = model.UserName,
                Email = model.Email,

            };

            bool imageProccessDone = false;

            if (model.ProfilePic != null)
            {
                imageProccessDone = await CustomUserProfilePictureAsync(model, user);
            }
            else
            {
                imageProccessDone = await DefaultProfilePictureAsync(model, user);
            }

            if (imageProccessDone)
            {

                IdentityResult result = await _userManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {
                    return Ok(model);

                }
                else
                {
                    ////return BadRequest(new { message = "Registration failed", errors = result.Errors.Select(e => e.Description) });
                    //return BadRequest(new { message = "Registration failed", errors = result.Errors
                    //    .GroupBy(e => e.Code.Contains("Email") ? "Email" : e.Code.Contains("UserName") ? "UserName" : "General")
                    //.ToDictionary(d => d.Key, d => d.Select)});

                    return BadRequest(new
                    {
                        message = "Registration failed",
                        errors = result.Errors
                        .GroupBy(e => e.Code.Contains("Email") ? "Email"
                        : e.Code.Contains("UserName") ? "UserName"
                            : "General")
                            .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToList())
                    });//Ridicules query


                }
            }
            else
            {
                _logger.LogError($"IMAGE proccessing failed , so we did not create user from form {model.ToJson()}");
                return StatusCode(500, new { message = "Image processing failed" });
            }

        }


        private async Task<bool> CustomUserProfilePictureAsync(RegisterDTO model, ApplicationUser user)
        {
            bool imageProccessDone = false;
            string guidAndName = Guid.NewGuid() + _fileNameSanitizer.SanitizeFileName(model.ProfilePic.FileName);
            string path = Path.Combine(_webHostEnvironment.WebRootPath, "ProfilePics");
            string iconsPath = Path.Combine([_webHostEnvironment.WebRootPath, path, "ProfileIcons"]);

            if (!Directory.Exists(path))//this check might be useless Create Directory possibly does this already  
            {
                Directory.CreateDirectory(path);
            }

            if (!Directory.Exists(iconsPath))
            {
                Directory.CreateDirectory(iconsPath);
            }

            path = Path.Combine(path, guidAndName);
            iconsPath = Path.Combine(iconsPath, guidAndName);


            try
            {
                await using (FileStream stream = new FileStream(path, FileMode.Create))
                {
                    using Image Image = await Image.LoadAsync(model.ProfilePic.OpenReadStream());
                    {

                        await using (FileStream iconImageStream = new FileStream(iconsPath, FileMode.Create))
                        {
                            using (Image imageIcon = Image.Clone(x => x.Resize(800, 800)))
                            {
                                await imageIcon.SaveAsJpegAsync(iconImageStream);
                            }

                        }

                        await Image.SaveAsJpegAsync(stream);


                        user.profilePic = path;
                        imageProccessDone = true;

                    }
                }
            }
            catch (FileNotFoundException ex)
            {
                _logger.LogError("Inside CustomUserProfilePictureAsync we ran into a file path issue ,", ex);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogError(ex, "Inside CustomUserProfilePictureAsyncwe ran into UnauthorizedAccessException possible leak of unclosed I/0");
            }
            catch (IOException ex)
            {
                _logger.LogError(ex, "Inside CustomUserProfilePictureAsync an error occurred  in the streams reading");
            }
            catch (ImageFormatException ex)
            {
                _logger.LogError(ex, $"Inside CustomUserProfilePictureAsync Image sharp could not process  the image {ex.Message}");
            }

            return imageProccessDone;



        }



        private async Task<bool> DefaultProfilePictureAsync(RegisterDTO model, ApplicationUser user)
        {
            bool imageProccessDone = false;
            string defaultImage = "DEFAULT";
            string defaultImagePath = @"C:\Users\why19\Downloads\0_Nn3K0jqCPuxdyK3B.jpg";



            string path = Path.Combine(_webHostEnvironment.WebRootPath, "ProfilePics", defaultImage);
            string iconsPath = Path.Combine([_webHostEnvironment.WebRootPath, "ProfilePics", "ProfileIcons"]);

            if (!Directory.Exists(path))//this check might be useless Create Directory possibly does this already  
            {
                Directory.CreateDirectory(path);
            }

            if (!Directory.Exists(iconsPath))
            {
                Directory.CreateDirectory(iconsPath);
            }

            path = Path.Combine(path, defaultImage + ".jpg");
            iconsPath = Path.Combine(iconsPath, defaultImage + ".jpg");

            try
            {
                await using (FileStream stream = new FileStream(defaultImagePath, FileMode.Open, FileAccess.Read))
                {

                    await using (FileStream create = new FileStream(path, FileMode.Create))
                    {
                        using (Image image = await Image.LoadAsync(stream))
                        {
                            await image.SaveAsJpegAsync(create);

                            await using (FileStream iconCreate = new FileStream(iconsPath, FileMode.Create))
                            {
                                using (Image imageIcon = image.Clone(x => x.Resize(800, 800)))
                                {
                                    await imageIcon.SaveAsJpegAsync(iconCreate);
                                }
                            }


                        }


                    }

                    imageProccessDone = true;
                    user.profilePic = path;

                }
            }
            catch (FileNotFoundException ex)
            {
                _logger.LogError("Inside the default image creation we ran into a file path issue ,", ex);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogError(ex, "Inside the default image creation we ran into UnauthorizedAccessException possible leak of unclosed I/0");
            }
            catch (IOException ex)
            {
                _logger.LogError(ex, "Inside the default image creation an error ocrrued in the streams reading");
            }
            catch (ImageFormatException ex)
            {
                _logger.LogError(ex, $"Inside the default image creation Image sharp could not process  the image {ex.Message}");
            }
            return imageProccessDone;


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

        private string GenerateJwtToken(ApplicationUser user)
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


        [HttpGet("cock")]
        public async Task<IActionResult> Cock()
        {

            var files = Directory.GetFiles(Path.Combine(_webHostEnvironment.WebRootPath, "ProfilePics", "ProfileIcons"));
            foreach (var file in files)
            {
                Console.WriteLine(file);
            }

            return Ok();
        }
    }
}
