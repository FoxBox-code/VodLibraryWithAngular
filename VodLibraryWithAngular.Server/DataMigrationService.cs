using VodLibraryWithAngular.Server.Data;

namespace VodLibraryWithAngular.Server
{
    public class DataMigrationService
    {
        private ApplicationDbContext _context;

        public DataMigrationService(ApplicationDbContext context)
        {
            _context = context;
        }


        public void Run()
        {
            var users = _context.Users
                .Select(u => new
                {
                    UserName = u.UserName,
                    UserId = u.Id
                })
                .ToList();

            Dictionary<string, string> dic = new Dictionary<string, string>();

            foreach (var user in users)
            {
                dic[user.UserName] = user.UserId;
            }

            var comments = _context.Comments.ToList();

            foreach (var comment in comments)
            {
                comment.UserId = dic[comment.UserName];
            }

            var replies = _context.Replies.ToList();

            foreach (var reply in replies)
            {
                reply.UserId = dic[reply.UserName];
            }

            _context.SaveChanges();

            Console.WriteLine("Migration script completed , all users in table comments/replies have ids to them");
        }
    }
}
