import Embed from "@editorjs/embed";
import List from "@editorjs/list";
import Image from "@editorjs/image";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";

const uploadImageByFile = (event) => {
    return new Promise((resolve, reject) => {
        const file = event;
        try {
            const url = URL.createObjectURL(file);
            resolve({
                success: 1,
                file: { url }
            });
        } catch (error) {
            reject({
                success: 0,
                message: "Image upload failed"
            });
        }
    });
};

const uploadImageByURL = (url) => {
    return Promise.resolve({
        success: 1,
        file: { url }
    });
};

export const tools = {
    embed: Embed,
    list: {
        class: List,
        inlineToolBar: true
    },
    image: {
        class: Image,
        config: {
            uploader: {
                uploadByUrl: uploadImageByURL,
                uploadByFile: uploadImageByFile,
            }
        }
    },
    header: {
        class: Header,
        config: {
            placeholder: "Type Heading....",
            levels: [2, 3],
            defaultLevel: 2
        }
    },
    quote: {
        class: Quote,
        inlineToolBar: true
    },
    marker: Marker,
    inlineCode: InlineCode
};
