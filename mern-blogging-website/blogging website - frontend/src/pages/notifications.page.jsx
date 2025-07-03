import axios from "axios";
import { useContext, useState, useEffect } from "react";
import { UserContext } from "../App";
import NotificationCard from "../components/notification-card.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import LoadMoreDataBtn from "../components/load-more.component";
import ServerStatus from "../components/server-status.component";

const Notifications = () => {
    let {userAuth, userAuth: { access_token, new_notification_available }, setUserAuth } = useContext(UserContext);
    const [notifications, setNotifications] = useState({ results: [], totalDocs: 0, page: 1 });

    // For non-admin users, only show reply notifications
    const isAdmin = userAuth?.isAdmin || userAuth?.admin || userAuth?.role === 'admin';
    const [filter, setFilter] = useState(isAdmin ? 'all' : 'reply');
    
    // Check if server domain is configured
    if (!import.meta.env.VITE_SERVER_DOMAIN) {
        console.error('VITE_SERVER_DOMAIN environment variable is not set!');
        return <div className="text-center p-8">Server configuration error. Please check your environment variables.</div>;
    }

    // Only show filter buttons for admin users
    let filters = isAdmin ? ['all', 'like', 'comment', 'reply'] : ['reply'];

    const fetchNotifications = ({ page, deletedDocCount = 0 }) => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/notifications", {
            page, filter, deletedDocCount
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
            .then(async ({ data: { notifications: data } }) => {
                // Always mark notifications as seen when visiting the page
                if(new_notification_available){
                    setUserAuth({...userAuth, new_notification_available: false });
                }
                // Mark all notifications as seen
                axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/seen-notifications", { }, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    }
                })
                let formattedData = await filterPaginationData({
                    state: notifications,
                    data, page,
                    countRoute: "/all-notifications-count",
                    data_to_send: { filter },
                    user: access_token
                })
                setNotifications(formattedData)
            })
            .catch(err => {
                console.error('Error fetching notifications:', err);
                if (err.code === 'ERR_NETWORK' || err.message.includes('ECONNREFUSED')) {
                    console.error('Server connection failed. Make sure the server is running on port 3000.');
                }
            })
    }

    useEffect(() => {
        if (access_token) {
            fetchNotifications({ page: 1 })
        } else {
            console.warn('No access token available. User may not be logged in.');
        }
    }, [access_token, filter])

    const handleFilter = (e) => {
        let btn = e.target;
        setFilter(btn.innerHTML.toLowerCase());
        setNotifications(null);
    }
    return (
        <ServerStatus>
            <div>
                <h1 className="max-md:hidden">{isAdmin ? 'Recent Notifications' : 'Notifications'}</h1>
                {isAdmin && (
                    <div className="my-8 flex gap-6">
                        {filters.map((filterName, i) => (
                            <button key={i} className={`py-2 ${filter === filterName ? 'btn-dark' : 'btn-light'}`} onClick={handleFilter}>
                                {filterName}
                            </button>
                        ))}
                    </div>
                )}
                {
                    notifications === null ? <Loader /> :
                        <>
                            {
                                notifications && notifications.results && notifications.results.length ?
                                    // Render notifications in chunks of 5, with a LoadMoreDataBtn after each chunk
                                    Array.from({ length: Math.ceil(notifications.results.length / 5) }).map((_, chunkIdx) => (
                                        <div key={chunkIdx}>
                                            {notifications.results.slice(chunkIdx * 5, (chunkIdx + 1) * 5).map((notification, i) => (
                                                <AnimationWrapper key={chunkIdx * 5 + i} transition={{ delay: (chunkIdx * 5 + i) * 0.08 }}>
                                                    <NotificationCard data={notification} index={chunkIdx * 5 + i} notificationState={{notifications, setNotifications}}/>
                                                </AnimationWrapper>
                                            ))}
                                            {/* Show LoadMoreDataBtn only after the last chunk if there are more notifications to load */}
                                            {(chunkIdx === Math.floor((notifications.results.length - 1) / 5)) &&
                                                <LoadMoreDataBtn state={notifications} fetchDataFun={fetchNotifications} additionalParam={{ deletedDocCount: notifications?.deletedDocCount }} />
                                            }
                                        </div>
                                    ))
                                    : <NoDataMessage message="Nothing available" />
                            }
                        </>
                }
            </div>
        </ServerStatus>
    )

}
export default Notifications;
