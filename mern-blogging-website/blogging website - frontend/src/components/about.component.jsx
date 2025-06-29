import { Link } from "react-router-dom";
import { getFullDay } from "../common/date";

const AboutUser = ({ className, bio = "", social_links = {}, joinedAt }) => {
    return (
        <div className={"md:w-[90%] md:mt-7 " + className}>
            {bio?.length ? <p className="text-xl leading-7">{bio}</p> : null}

            <div className="flex items-center gap-x-7 gap-y-2 flex-wrap my-7 text-dark-grey">
                {Object.keys(social_links).map((key) => {
                    let link = social_links[key];
                    return link ?
                        <Link to={link} key={key} target="_blank">
                            <i className={"fi " + (key !== 'website' ? "fi-brands-" + key : "fi-rr-globe") + " text-2xl hover:text-black"}></i>
                        </Link>
                        : " "
                })}
            </div>


            <p className="text-xl leading-7 text-dark-grey">
                Joined on {getFullDay(joinedAt)}
            </p>
        </div>
    );
};


export default AboutUser;
