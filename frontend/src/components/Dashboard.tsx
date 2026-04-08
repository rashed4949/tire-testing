const Dashboard: React.FC = () => {
    const user = localStorage.getItem("user");
    const parsedUser = user ? JSON.parse(user) : null;

    return (
        <div>
            <h2>Dashboard</h2>
            {parsedUser ? (
                <p>Welcome, {parsedUser.username || parsedUser.email}!</p>
            ) : (
                <p>Please log in.</p>
            )}
        </div>
    );
};

export default Dashboard;