import { useFeatureFlagEnabled } from 'posthog-js/react'
import styles from './magickml-chatbox.module.css'
import { Widget } from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';
import chatbot from '../assets/chatbot.png'

/* eslint-disable-next-line */
export interface MagickmlChatboxProps {}

export function MagickmlChatbox(props: MagickmlChatboxProps) {

  const showChatBoxFlag = useFeatureFlagEnabled('chat-exp-chatbox')

  const handleNewUserMessage = (newMessage) => {
    // Now send the message throught the backend API
    console.log(`New message incoming! ${newMessage}`);
  };

  const getCustomLauncher = (handleToggle) => {
    console.log('handleToggle = ', handleToggle.isWidgetOpened)
    return <button className={styles['defaultCloseButton']} onClick={handleToggle}><img src={chatbot} /></button>
  }
    

  return (
    <div className={styles['container']}>
      {
        showChatBoxFlag ? (
          <Widget
            handleNewUserMessage={handleNewUserMessage}
            // profileAvatar={logo}
            title="Magick Bot"
            emojis="true"
            subtitle="Welcome to Magick!"
            showCloseButton="true"
            launcher={handleToggle => getCustomLauncher(handleToggle)}
          />
        ) : ''
      }
    </div>
  )
}

export default MagickmlChatbox
