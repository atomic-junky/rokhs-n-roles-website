import { getSanityImageURL } from '../utils/helpers.js';

export const imageType = ({ value }) => {
    return (
        <div class="content-image-container">
            <img src={getSanityImageURL(value.asset).url()} />
            <br/>
        </div>
    )
}