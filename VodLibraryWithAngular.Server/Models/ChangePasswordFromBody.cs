namespace VodLibraryWithAngular.Server.Models
{
    public class ChangePasswordFromBody
    {
        public string Email { get; set; }

        public string NewPassword { get; set; }

        public string ConfirmedPassword { get; set; }
    }
}
