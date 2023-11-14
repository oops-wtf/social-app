import React from 'react'
import {View, StyleSheet, ActivityIndicator} from 'react-native'
import {ProfileModeration} from '@atproto/api'
import {Button} from '#/view/com/util/forms/Button'
import {usePalette} from 'lib/hooks/usePalette'
import {SuggestedActor} from 'state/models/discovery/suggested-actors'
import {sanitizeDisplayName} from 'lib/strings/display-names'
import {sanitizeHandle} from 'lib/strings/handles'
import {s} from 'lib/styles'
import {UserAvatar} from 'view/com/util/UserAvatar'
import {Text} from 'view/com/util/text/Text'
import Animated, {FadeInRight} from 'react-native-reanimated'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {useAnalytics} from 'lib/analytics/analytics'
import {Trans} from '@lingui/macro'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {
  useProfileFollowMutation,
  useProfileUnfollowMutation,
} from '#/state/queries/profile'
import {logger} from '#/logger'

type Props = {
  profile: SuggestedActor
  dataUpdatedAt: number
  moderation: ProfileModeration
  onFollowStateChange: (props: {
    did: string
    following: boolean
  }) => Promise<void>
}

export function RecommendedFollowsItem({
  profile,
  dataUpdatedAt,
  moderation,
  onFollowStateChange,
}: React.PropsWithChildren<Props>) {
  const pal = usePalette('default')
  const {isMobile} = useWebMediaQueries()
  const shadowedProfile = useProfileShadow(profile, dataUpdatedAt)

  return (
    <Animated.View
      entering={FadeInRight}
      style={[
        styles.cardContainer,
        pal.view,
        pal.border,
        {
          maxWidth: isMobile ? undefined : 670,
          borderRightWidth: isMobile ? undefined : 1,
        },
      ]}>
      <ProfileCard
        key={profile.did}
        profile={shadowedProfile}
        onFollowStateChange={onFollowStateChange}
        moderation={moderation}
      />
    </Animated.View>
  )
}

export function ProfileCard({
  profile,
  onFollowStateChange,
  moderation,
}: Omit<Props, 'dataUpdatedAt'>) {
  const {track} = useAnalytics()
  const pal = usePalette('default')
  const [addingMoreSuggestions, setAddingMoreSuggestions] =
    React.useState(false)
  const {mutateAsync: follow} = useProfileFollowMutation()
  const {mutateAsync: unfollow} = useProfileUnfollowMutation()

  const onToggleFollow = React.useCallback(async () => {
    try {
      if (
        profile.viewer?.following &&
        profile.viewer?.following !== 'pending'
      ) {
        await unfollow({did: profile.did, followUri: profile.viewer.following})
      } else if (
        !profile.viewer?.following &&
        profile.viewer?.following !== 'pending'
      ) {
        setAddingMoreSuggestions(true)
        await follow({did: profile.did})
        await onFollowStateChange({did: profile.did, following: true})
        setAddingMoreSuggestions(false)
        track('Onboarding:SuggestedFollowFollowed')
      }
    } catch (e) {
      logger.error('RecommendedFollows: failed to toggle following', {error: e})
    } finally {
      setAddingMoreSuggestions(false)
    }
  }, [
    profile,
    follow,
    unfollow,
    setAddingMoreSuggestions,
    track,
    onFollowStateChange,
  ])

  return (
    <View style={styles.card}>
      <View style={styles.layout}>
        <View style={styles.layoutAvi}>
          <UserAvatar
            size={40}
            avatar={profile.avatar}
            moderation={moderation.avatar}
          />
        </View>
        <View style={styles.layoutContent}>
          <Text
            type="2xl-bold"
            style={[s.bold, pal.text]}
            numberOfLines={1}
            lineHeight={1.2}>
            {sanitizeDisplayName(
              profile.displayName || sanitizeHandle(profile.handle),
              moderation.profile,
            )}
          </Text>
          <Text type="xl" style={[pal.textLight]} numberOfLines={1}>
            {sanitizeHandle(profile.handle, '@')}
          </Text>
        </View>

        <Button
          type={profile.viewer?.following ? 'default' : 'inverted'}
          labelStyle={styles.followButton}
          onPress={onToggleFollow}
          label={profile.viewer?.following ? 'Unfollow' : 'Follow'}
          withLoading={true}
        />
      </View>
      {profile.description ? (
        <View style={styles.details}>
          <Text type="lg" style={pal.text} numberOfLines={4}>
            {profile.description as string}
          </Text>
        </View>
      ) : undefined}
      {addingMoreSuggestions ? (
        <View style={styles.addingMoreContainer}>
          <ActivityIndicator size="small" color={pal.colors.text} />
          <Text style={[pal.text]}>
            <Trans>Finding similar accounts...</Trans>
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    borderTopWidth: 1,
  },
  card: {
    paddingHorizontal: 10,
  },
  layout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layoutAvi: {
    width: 54,
    paddingLeft: 4,
    paddingTop: 8,
    paddingBottom: 10,
  },
  layoutContent: {
    flex: 1,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  details: {
    paddingLeft: 54,
    paddingRight: 10,
    paddingBottom: 10,
  },
  addingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 54,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 4,
  },
  followButton: {
    fontSize: 16,
  },
})
